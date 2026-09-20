/**
 * DSH 集成契约静态校验（`npm run check` 的第三半）。
 *
 * 校验的是「本插件声明的服务名与依赖包名，在真实 DSH 安装里确实存在」。
 * 这类错误的表现是**插件静默不激活**——主题根本没生效，却没有任何报错：
 *   - `inject`（cordis 服务名）写错 → fiber 永远等不到服务
 *   - `dsh.client.inject`（包名）写错 → 客户端依赖图解析不到
 *
 * DSH 处于 alpha 阶段且确有改名先例（`settingsNamespace()` 助手曾被移除），
 * 所以这项检查值得常驻。
 *
 * 找不到 DSH 安装时**优雅跳过**（退出 0），因此 CI 里不会因此失败——
 * 它只在装了 DSH 的机器上有意义。
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const PKG = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

/** 探测 DSH 安装目录；找不到返回 undefined。 */
async function findDshRoot() {
  const candidates = []
  if (process.env.DSH_ROOT) {
    // 显式指定时只认它，不回退——便于验证「找不到则跳过」这条路径
    candidates.push(process.env.DSH_ROOT)
  } else {
    try {
      const bin = execFileSync('which', ['dsh'], { encoding: 'utf8' }).trim()
      if (bin) {
        // <...>/bin/dsh -> <...>/lib/node_modules/@deepseek-ai/dsh
        const prefix = dirname(dirname(bin))
        candidates.push(join(prefix, 'lib', 'node_modules', '@deepseek-ai', 'dsh'))
      }
    } catch {
      /* 没有 dsh 命令，继续用默认路径 */
    }
    candidates.push('/usr/local/node-v24.19.0/lib/node_modules/@deepseek-ai/dsh')
  }

  for (const candidate of candidates) {
    try {
      const info = await stat(join(candidate, 'package.json'))
      if (info.isFile()) return candidate
    } catch {
      /* 试下一个 */
    }
  }
  return undefined
}

const dshRoot = await findDshRoot()
if (dshRoot === undefined) {
  console.log('[check-dsh-names] 未找到 DSH 安装，跳过（CI 中属预期）')
  process.exit(0)
}

console.log(`[check-dsh-names] DSH: ${dshRoot}`)

const failures = []
const passes = []
function check(label, ok, detail = '') {
  if (ok) passes.push(label)
  else failures.push(`${label}${detail ? ` —— ${detail}` : ''}`)
}

// ---- 1. dsh.client.inject 声明的包必须存在于 DSH ----
const clientInject = PKG.dsh?.client?.inject ?? []
for (const packageName of clientInject) {
  const target = join(dshRoot, 'node_modules', ...packageName.split('/'))
  check(`客户端依赖包存在：${packageName}`, existsSync(join(target, 'package.json')))
}

// ---- 2. 客户端 exports.inject 的服务名必须在 DSH 类型里有声明 ----
const clientBundle = PKG.exports?.['./client']
const clientPath =
  typeof clientBundle === 'string' ? clientBundle : clientBundle?.default
let serviceNames = []
if (clientPath !== undefined && existsSync(join(root, clientPath))) {
  const source = await readFile(join(root, clientPath), 'utf8')
  const match = source.match(/exports\.inject\s*=\s*\[([^\]]*)\]/)
  if (match !== null) {
    serviceNames = [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
  }
}
check(`能从产物提取 exports.inject（${serviceNames.join(', ') || '无'}）`, serviceNames.length > 0)

/** 在 DSH 的 .d.ts 里找 `interface Context { name: ... }` 形式的服务声明。 */
async function collectContextServices() {
  const found = new Set()
  const packagesDir = join(dshRoot, 'node_modules', '@deepseek-ai')
  let entries = []
  try {
    entries = await readdir(packagesDir)
  } catch {
    return found
  }
  for (const entry of entries) {
    const typesDir = join(packagesDir, entry, 'lib', 'types')
    if (!existsSync(typesDir)) continue
    for (const file of await walk(typesDir)) {
      const text = await readFile(file, 'utf8')
      for (const block of text.matchAll(/interface Context\s*\{([\s\S]{0,4000}?)\n\s*\}/g)) {
        for (const line of block[1].split('\n')) {
          const hit = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$]/)
          if (hit !== null) found.add(hit[1])
        }
      }
    }
  }
  return found
}

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

const services = await collectContextServices()
for (const name of serviceNames) {
  check(`服务名在 DSH 类型里有声明：${name}`, services.has(name))
}

// ---- 3. 宿主端 settings 命名空间不应被其他插件占用 ----
const namespace = 'dafy-whale'
const packagesDir = join(dshRoot, 'node_modules', '@deepseek-ai')
let taken = []
try {
  for (const entry of await readdir(packagesDir)) {
    for (const file of await walk(join(packagesDir, entry, 'lib')).catch(() => [])) {
      const text = await readFile(file, 'utf8')
      if (new RegExp(`register\\(\\s*["']${namespace}["']`).test(text) && !entry.includes('dafy')) {
        taken.push(entry)
      }
    }
  }
} catch {
  /* 读不到就跳过冲突检查 */
}
check(
  `settings 命名空间 "${namespace}" 未被其他插件占用`,
  taken.length === 0,
  taken.length > 0 ? `被以下包占用：${taken.join(', ')}` : '',
)

// ---- 报告 ----
for (const label of passes) console.log(`  ✓ ${label}`)
for (const label of failures) console.error(`  ✗ ${label}`)
console.log(`\n[check-dsh-names] ${passes.length} 通过 / ${failures.length} 失败`)

if (failures.length > 0) {
  console.error('[check-dsh-names] 集成契约名字有误，插件可能静默不激活')
  process.exit(1)
}
