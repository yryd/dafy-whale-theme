/**
 * 宿主半部测试（node:test）。
 *
 * 覆盖两件在运行时才会暴露、且失败即「静默」的事：
 *   1. settings 命名空间是否用**正确的名字**注册（名字错了客户端就 bind 不到）
 *   2. `/dafy-assets/*` 路由的**白名单与路径穿越防护**
 *
 * 不启动 DSH：用桩 ctx 调用 apply，然后直接驱动真实的 route handler。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const host = await import(join(root, 'lib', 'index.js'))

/** 桩 ctx：记录注册与注入行为。 */
function makeCtx() {
  const routes = []
  const namespaces = []
  const injected = []
  const effects = []

  const ctx = {
    effect(fn) {
      effects.push(fn)
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    inject(names, callback) {
      injected.push(names)
      callback(ctx)
    },
    get(name) {
      if (name === 'settings') {
        return {
          register(namespace, schema) {
            namespaces.push({ namespace, schema })
          },
        }
      }
      return undefined
    },
    webServer: {
      register(route) {
        routes.push(route)
        return () => {}
      },
    },
  }

  return { ctx, routes, namespaces, injected, effects }
}

/** 桩响应对象，记录 writeHead 与 end。 */
function makeRes() {
  return {
    status: undefined,
    headers: undefined,
    body: undefined,
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
  }
}

async function routeFor(pathname, method = 'GET') {
  const { ctx, routes } = makeCtx()
  host.apply(ctx)
  const route = routes.find((entry) => entry.path === '/dafy-assets')
  assert.ok(route, '应注册 /dafy-assets 前缀路由')
  const res = makeRes()
  await route.handler({ method, url: pathname }, res)
  return res
}

test('宿主声明 inject = ["webServer"]', () => {
  assert.equal([...host.inject].join(','), 'webServer')
})

test('宿主导出 apply 与包名', () => {
  assert.equal(typeof host.apply, 'function')
  assert.equal(host.name, 'dafy-whale-theme')
})

test('settings 命名空间以 dafy-whale 注册（与客户端 bind 的名字一致）', () => {
  const { ctx, namespaces, injected } = makeCtx()
  host.apply(ctx)
  assert.deepEqual(injected, [['settings']])
  assert.equal(namespaces.length, 1)
  assert.equal(namespaces[0].namespace, 'dafy-whale')
  assert.equal(namespaces[0].namespace, host.SETTINGS_NAMESPACE)
  assert.ok(namespaces[0].schema, '应同时注册 schema')
})

test('未组合 settings 服务时宿主仍可加载（主题以默认值工作）', () => {
  const { ctx, routes } = makeCtx()
  // 模拟 settings 服务缺席
  ctx.get = () => undefined
  assert.doesNotThrow(() => host.apply(ctx))
  assert.equal(routes.length, 1, '素材路由仍应注册')
})

test('素材路由注册为 prefix 形态', () => {
  const { ctx, routes } = makeCtx()
  host.apply(ctx)
  assert.equal(routes[0].kind, 'prefix')
  assert.equal(routes[0].path, '/dafy-assets')
})

test('白名单素材返回 200 + image/png 且字节与源文件一致', async () => {
  const res = await routeFor('/dafy-assets/whale_icon.png')
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'image/png')
  assert.ok(res.headers['cache-control'].includes('max-age'))
  assert.ok(Buffer.isBuffer(res.body), '应返回 Buffer')

  const source = await readFile(join(root, 'assets', 'whale_icon.png'))
  assert.deepEqual(res.body, source, '返回内容应与 assets/ 下的文件逐字节一致')
})

test('全部 5 个白名单素材都可取', async () => {
  for (const name of [
    'whale_front.png',
    'whale_side.png',
    'whale_icon.png',
    'fish_idle.png',
    'fish_happy.png',
  ]) {
    const res = await routeFor(`/dafy-assets/${name}`)
    assert.equal(res.status, 200, `${name} 应可取`)
  }
})

test('只接受 GET / HEAD，其余方法 405', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const res = await routeFor('/dafy-assets/whale_icon.png', method)
    assert.equal(res.status, 405, `${method} 应被拒绝`)
  }
})

test('HEAD 请求走同一路径（状态 200）', async () => {
  const res = await routeFor('/dafy-assets/whale_icon.png', 'HEAD')
  assert.equal(res.status, 200)
})

test('不在白名单的文件 404', async () => {
  for (const name of ['nope.png', 'package.json', 'preview.png', 'whale_icon.PNG', '']) {
    const res = await routeFor(`/dafy-assets/${name}`)
    assert.equal(res.status, 404, `${name || '(空)'} 应 404`)
  }
})

test('路径穿越被阻断（URL 规范化形式）', async () => {
  const res = await routeFor('/dafy-assets/../package.json')
  assert.equal(res.status, 404)
})

test('路径穿越被阻断（URL 编码形式 %2e%2e%2f）', async () => {
  const res = await routeFor('/dafy-assets/%2e%2e%2fpackage.json')
  assert.equal(res.status, 404)
})

test('路径穿越被阻断（编码斜杠绕白名单）', async () => {
  const res = await routeFor('/dafy-assets/whale_icon.png%2f..%2f..%2fpackage.json')
  assert.equal(res.status, 404)
})

test('绝对路径注入被阻断', async () => {
  const res = await routeFor('/dafy-assets/%2Fetc%2Fpasswd')
  assert.equal(res.status, 404)
})

test('非前缀路径不命中白名单', async () => {
  const res = await routeFor('/dafy-assets')
  assert.equal(res.status, 404)
})

test('apply 登记了 effect（路由随 fiber 卸载）', () => {
  const { ctx, effects } = makeCtx()
  host.apply(ctx)
  assert.ok(effects.length >= 1, '应有 effect 包裹路由注册')
})
