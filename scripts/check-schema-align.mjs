/**
 * 宿主 schema ↔ 共享配置模型 的一致性校验（`npm run check` 的第二半）。
 *
 * 这是本项目**最容易静默出错**的地方：宿主用 schemastery 定义字段，
 * 客户端用 `keyof WhaleConfig` 读写字段。两边一旦脱节：
 *   - 宿主多一个字段 → 用户改了不生效，无报错
 *   - 客户端多一个字段 → `scope.set()` 写入被静默忽略
 *   - 默认值不一致 → 首帧与实际生效值不同
 *
 * 校验方式不是正则比对，而是**真实调用 schema**：把空对象喂给 schema，
 * 拿到的就是「全部字段 + 全部默认值」，再与 DEFAULTS 逐字段对照。
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const { DEFAULTS, RANGES } = await import(join(root, 'lib/config.js'))
const { ConfigSchema } = await import(join(root, 'lib/index.js'))

const failures = []
const passes = []

function check(label, ok, detail = '') {
  if (ok) passes.push(label)
  else failures.push(`${label}${detail ? ` —— ${detail}` : ''}`)
}

// ---- 1. schema 可调用，且解析空对象得到全部字段 ----
let resolved
try {
  resolved = ConfigSchema({})
  check('schema 可被调用并解析空对象', true)
} catch (error) {
  check('schema 可被调用并解析空对象', false, String(error))
}

if (resolved !== undefined) {
  const schemaKeys = Object.keys(resolved).sort()
  const defaultKeys = Object.keys(DEFAULTS).sort()

  const missing = defaultKeys.filter((key) => !schemaKeys.includes(key))
  const extra = schemaKeys.filter((key) => !defaultKeys.includes(key))

  check('字段名集合完全一致', missing.length === 0 && extra.length === 0,
    [missing.length ? `schema 缺少 ${missing.join(', ')}` : '', extra.length ? `schema 多出 ${extra.join(', ')}` : '']
      .filter(Boolean)
      .join('；'))

  // ---- 2. 默认值逐字段一致 ----
  const mismatched = []
  for (const key of defaultKeys) {
    const a = JSON.stringify(resolved[key])
    const b = JSON.stringify(DEFAULTS[key])
    if (a !== b) mismatched.push(`${key}: schema=${a} vs DEFAULTS=${b}`)
  }
  check('默认值逐字段一致', mismatched.length === 0, mismatched.join('；'))

  // ---- 3. 数值字段的边界与 RANGES 一致 ----
  const outOfRange = []
  for (const [field, range] of Object.entries(RANGES)) {
    const value = resolved[field]
    if (typeof value !== 'number') {
      outOfRange.push(`${field} 在 schema 中不是 number`)
      continue
    }
    if (value < range.min || value > range.max) {
      outOfRange.push(`${field} 默认值 ${value} 超出 [${range.min}, ${range.max}]`)
    }
  }
  check('数值字段默认值都落在 RANGES 内', outOfRange.length === 0, outOfRange.join('；'))
}

// ---- 4. 客户端产物里 setField 用到的字段名都在 schema 中 ----
try {
  const clientSource = await readFile(join(root, 'lib/client.cjs'), 'utf8')
  const used = new Set()
  for (const match of clientSource.matchAll(/\bset\(\s*["']([A-Za-z][A-Za-z0-9]*)["']/g)) {
    used.add(match[1])
  }
  const unknown = [...used].filter((field) => !(field in DEFAULTS))
  check(
    `客户端 setField 字段名合法（检出 ${used.size} 个）`,
    unknown.length === 0,
    unknown.length ? `未知字段 ${unknown.join(', ')}` : '',
  )
} catch (error) {
  check('可读取客户端产物', false, String(error))
}

// ---- 报告 ----
for (const label of passes) console.log(`  ✓ ${label}`)
for (const label of failures) console.error(`  ✗ ${label}`)
console.log(`\n[check-schema-align] ${passes.length} 通过 / ${failures.length} 失败`)

if (failures.length > 0) {
  console.error('[check-schema-align] schema 与配置模型不一致')
  process.exit(1)
}
