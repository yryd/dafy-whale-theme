/**
 * DSH 插件契约静态校验（`npm run check` 的第一半）。
 *
 * 校验的是「构建产物是否符合 DSH 的插件契约」。这些错误在运行时的表现往往是
 * **静默失效**（插件不激活、面板不出现、整站白屏），所以必须在发布前静态拦住。
 *
 * 检查项：
 *   1. package.json 的 dsh.bundle.patch 指向的文件存在
 *   2. exports["."] / exports["./client"] 指向的文件存在
 *   3. 宿主产物导出 apply
 *   4. 客户端产物包裹成 ModuleLoader（window.__ModuleLoader__.load）
 *   5. 客户端产物导出 apply 与 inject
 *   6. cordis.patch.yml 是顶层数组，且含本插件自身的 insert 行
 */

import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const PKG = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

const failures = []
const passes = []

function check(label, condition, detail = '') {
  if (condition) passes.push(label)
  else failures.push(`${label}${detail ? ` —— ${detail}` : ''}`)
}

async function exists(relative) {
  try {
    await stat(join(root, relative))
    return true
  } catch {
    return false
  }
}

/** 从 exports 字段取一个子路径的字符串目标（兼容 string 与 { default } 两种形态）。 */
function exportTarget(key) {
  const value = PKG.exports?.[key]
  if (typeof value === 'string') return value
  if (value !== null && typeof value === 'object' && typeof value.default === 'string') {
    return value.default
  }
  return undefined
}

// ---- 1. bundle patch ----
const patchPath = PKG.dsh?.bundle?.patch
check('package.json 声明了 dsh.bundle.patch', typeof patchPath === 'string')
if (typeof patchPath === 'string') {
  check(`bundle patch 文件存在 (${patchPath})`, await exists(patchPath))
}

// ---- 2. exports 指向的文件存在 ----
const hostTarget = exportTarget('.')
const clientTarget = exportTarget('./client')
check('exports["."] 已声明', hostTarget !== undefined)
check('exports["./client"] 已声明', clientTarget !== undefined)
if (hostTarget !== undefined) {
  check(`宿主入口存在 (${hostTarget})`, await exists(hostTarget))
}
if (clientTarget !== undefined) {
  check(`客户端入口存在 (${clientTarget})`, await exists(clientTarget))
}

// ---- 3. 宿主产物导出 apply ----
if (hostTarget !== undefined && (await exists(hostTarget))) {
  const source = await readFile(join(root, hostTarget), 'utf8')
  check('宿主产物导出 apply', /export\s+(?:function\s+apply|{[^}]*\bapply\b)/.test(source))
  check('宿主产物使用 ESM 语法', /^import\s|^export\s/m.test(source))
}

// ---- 4/5. 客户端产物形态 ----
if (clientTarget !== undefined && (await exists(clientTarget))) {
  const source = await readFile(join(root, clientTarget), 'utf8')
  check('客户端是 ModuleLoader 形态', source.includes('window.__ModuleLoader__.load'))
  check('客户端声明了包 id', source.includes(JSON.stringify(PKG.name)))
  check('客户端导出 apply', /exports\.apply\s*=/.test(source))
  check('客户端导出 inject', /exports\.inject\s*=/.test(source))
  check(
    '客户端不含顶层 ESM 语法（应为 CJS 包裹）',
    !/^\s*(?:import|export)\s/m.test(source),
    '客户端产物里出现 import/export 会让 ModuleLoader 解析失败',
  )
  check('客户端不 require 第三方库', !/require\(["'](?!react|react\/jsx-runtime)[^."']/.test(source))
}

// ---- 6. cordis.patch.yml ----
if (typeof patchPath === 'string' && (await exists(patchPath))) {
  const yaml = await readFile(join(root, patchPath), 'utf8')
  const lines = yaml.split('\n')
  const firstContentLine = lines.find((line) => line.trim().length > 0 && !line.trim().startsWith('#'))
  check('patch 是顶层数组（首行为 "- ..."）', firstContentLine?.trimStart().startsWith('- '))
  check('patch 含自身 insert 行', yaml.includes(`name: ${PKG.name}`))
}

// ---- 报告 ----
for (const label of passes) console.log(`  ✓ ${label}`)
for (const label of failures) console.error(`  ✗ ${label}`)
console.log(`\n[check-dsh] ${passes.length} 通过 / ${failures.length} 失败`)

if (failures.length > 0) {
  console.error('[check-dsh] 契约校验未通过')
  process.exit(1)
}
