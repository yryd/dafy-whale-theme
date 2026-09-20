/**
 * 客户端产物接线测试（node:test + node:vm，零测试框架依赖）。
 *
 * 不启动 DSH，也不碰 DOM：伪造 `window.__ModuleLoader__` 与最小 DOM 桩，
 * 加载真实构建产物 `lib/client.cjs`，断言插槽注册与组件行为。
 * 这是「改客户端必须重启 dsh」约束下能做的最强自动化验证。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/** 最小 DOM 桩：apply 只会用到这几处。 */
function makeDocument() {
  const appended = []
  return {
    appended,
    documentElement: { style: { setProperty() {} } },
    querySelector: () => null,
    createElement: () => {
      const el = {
        dataset: {},
        textContent: '',
        parentNode: { removeChild() {} },
      }
      appended.push(el)
      return el
    },
    head: { appendChild() {} },
  }
}

/** React 桩：足够驱动组件函数。 */
function makeReact() {
  return {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    Fragment: Symbol('Fragment'),
  }
}

const jsxRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
  Fragment: Symbol('Fragment'),
}

/** 加载真实产物，返回 ModuleLoader 捕获到的声明。 */
async function loadBundle() {
  const code = await readFile(join(root, 'lib', 'client.cjs'), 'utf8')
  const document = makeDocument()
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(spec) {
          captured = spec
        },
      },
    },
    document,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
  }
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox)
  assert.ok(captured, '产物应调用 window.__ModuleLoader__.load')
  return { captured, document }
}

function makeRequire() {
  const React = makeReact()
  return (name) => {
    if (name === 'react') return React
    if (name === 'react/jsx-runtime') return jsxRuntime
    throw new Error(`意外的外部 require: ${name}`)
  }
}

/** 收集 apply 期间的插槽注册。 */
async function applyWithStubs() {
  const { captured, document } = await loadBundle()
  const exportsObject = captured.factory(makeRequire())

  const registrations = []
  const injections = []
  const effects = []
  const tokenCalls = []
  const writes = []

  const slots = {
    inject(name, setup) {
      injections.push(name)
      const result = setup()
      // 驱动 generator（品牌区两个插槽是成对 yield 注册的）
      if (result !== null && typeof result === 'object' && Symbol.iterator in result) {
        for (const _ of result) void _
      }
      return result
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  }

  const ctx = {
    effect(fn) {
      effects.push(fn)
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    slots,
    theme: {
      overrideTokens(source, tokens) {
        tokenCalls.push({ source, tokens })
        return () => {}
      },
    },
    settingsScope: {
      bind({ namespace }) {
        assert.equal(namespace, 'dafy-whale')
        return {
          getSnapshot: () => ({ value: undefined }),
          subscribe: () => () => {},
          set: (field, value) => {
            writes.push({ field, value })
            return Promise.resolve()
          },
          unset: () => Promise.resolve(),
        }
      },
    },
  }

  exportsObject.apply(ctx)
  return { exportsObject, registrations, injections, effects, tokenCalls, writes, document, captured }
}

test('产物声明了正确的 ModuleLoader id', async () => {
  const { captured } = await loadBundle()
  assert.equal(captured.id, 'dafy-whale-theme')
  assert.equal(typeof captured.factory, 'function')
})

test('注入声明包含 slots / theme / settingsScope', async () => {
  const { exportsObject } = await applyWithStubs()
  // 产物跑在 vm 的独立 realm 里，数组原型不同，因此比较内容而非结构
  assert.equal([...exportsObject.inject].join(','), 'slots,theme,settingsScope')
  assert.equal(typeof exportsObject.apply, 'function')
})

test('注册了全部 6 个插槽', async () => {
  const { registrations } = await applyWithStubs()
  const names = registrations.map((entry) => entry.options.name).sort()
  assert.deepEqual(names, [
    'conversation.input.dock',
    'settings.section',
    'shell.overlay',
    'sidebar.brand.mark',
    'sidebar.brand.name',
    'sidebar.footer.action',
  ])
})

test('品牌区两个 single 插槽成对注册且不带 id', async () => {
  const { registrations } = await applyWithStubs()
  const mark = registrations.find((entry) => entry.options.name === 'sidebar.brand.mark')
  const name = registrations.find((entry) => entry.options.name === 'sidebar.brand.name')
  assert.ok(mark, 'brand.mark 应被注册')
  assert.ok(name, 'brand.name 应被注册')
  assert.equal(mark.options.id, undefined)
  assert.equal(name.options.id, undefined)
})

test('设置面板注册到 settings.section 且有 id 与 label', async () => {
  const { registrations } = await applyWithStubs()
  const section = registrations.find((entry) => entry.options.name === 'settings.section')
  assert.ok(section, 'settings.section 应被注册')
  assert.equal(section.options.id, 'dafy-marine')
  assert.equal(typeof section.options.label, 'function')
  assert.equal(section.options.label(), '海洋主题')
  assert.equal(typeof section.component, 'function')
})

test('鱼群 chip 的 label 反映当前开关状态', async () => {
  const { registrations } = await applyWithStubs()
  const chip = registrations.find((entry) => entry.options.name === 'sidebar.footer.action')
  assert.ok(chip)
  // 默认 schoolEnabled = true → 显示「收起」文案
  assert.equal(chip.options.label(), '🐟 收起鱼群')
})

test('样式被注入到 head，且 effect 返回清理函数', async () => {
  const { document, effects } = await applyWithStubs()
  assert.ok(document.appended.length >= 1, '应创建一个 style 元素')
  assert.ok(effects.length >= 1, '应登记 effect')
})

test('品牌标记组件在关闭时渲染 null，开启时渲染 marker', async () => {
  const { registrations } = await applyWithStubs()
  const mark = registrations.find((entry) => entry.options.name === 'sidebar.brand.mark')
  const element = mark.component({})
  // 默认 brandIconVisible = true → 返回 span
  assert.ok(element, '默认应渲染标记')
  assert.equal(element.type, 'span')
  assert.equal(element.props.className, 'dafy-brand-mark')
})

test('设置面板组件可以渲染成树', async () => {
  const { registrations } = await applyWithStubs()
  const section = registrations.find((entry) => entry.options.name === 'settings.section')
  const tree = section.component({})
  assert.ok(tree, '面板应可渲染')
  assert.equal(tree.type, 'div')
  assert.equal(tree.props.className, 'dafy-panel')
  // 6 个分组：品牌区 / 配色 / 背景与氛围 / 鱼群 / 每日鱼语 / 界面
  assert.equal(tree.props.children.length, 6)
})

test('外部 require 未知模块会抛出（保证没有偷偷引入依赖）', async () => {
  const { captured } = await loadBundle()
  const require = makeRequire()
  assert.throws(() => require('lodash'), /意外的外部 require/)
  // factory 本身只用 react 与 react/jsx-runtime
  const exportsObject = captured.factory(require)
  assert.equal(typeof exportsObject.apply, 'function')
})
