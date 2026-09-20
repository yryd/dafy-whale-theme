#!/usr/bin/env node
// dafy-whale-theme 安装脚本：唯一官方通路的薄封装。
//
// 安装本身全部交给官方 CLI（本包声明 dsh.bundle，随依赖安装自动挂载）：
//   dsh plugin --profile web add dafy-whale-theme
//
// 本脚本只做一件事：尚未安装时，代为执行上面的官方命令（本仓库路径，file: 语义）。
// 无任何手动挂载逻辑；重复执行幂等。

import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
function opt(name, def) {
  const i = args.indexOf('--' + name)
  return i >= 0 && typeof args[i + 1] === 'string' ? args[i + 1] : def
}

const PKG_NAME = 'dafy-whale-theme'
const profile = opt('profile', 'web')
const home = process.env.DSH_HOME ?? join(os.homedir(), '.dsh')
const here = dirname(fileURLToPath(import.meta.url))

const profileDir = join(home, 'profiles', profile)
const pkgDir = join(profileDir, 'node_modules', PKG_NAME)

function log(...parts) {
  console.log('[dafy]', ...parts)
}

function fail(...parts) {
  console.error('[dafy]', ...parts)
  process.exit(1)
}

// ── 1. profile 完整性检查 ─────────────────────────────────────────────────
if (!existsSync(join(profileDir, 'package.json'))) {
  fail(`未找到 profile：${profileDir}`,
    '请先运行一次 `dsh web`（初始化 web profile）后再安装。')
}

// ── 2. 官方安装（幂等：已装则跳过） ──────────────────────────────────────
if (existsSync(join(pkgDir, 'package.json'))) {
  log('已安装：', pkgDir)
} else {
  log('执行官方安装：dsh plugin --profile', profile, 'add', here)
  const run = spawnSync('dsh', ['plugin', '--profile', profile, 'add', 'file:' + here], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (run.error !== undefined) {
    fail('找不到 `dsh` 命令。请安装 DeepSeek Harness 的 CLI 后重试，或直接执行：',
      'npx @deepseek-ai/dsh plugin --profile', profile, 'add', PKG_NAME)
  }
  if (run.status !== 0) {
    fail('官方安装失败（exit ' + run.status + '）。最常见原因是 pnpm 未安装：请先安装 pnpm 后重试。')
  }
}

// ── 3. 校验与后续提示 ─────────────────────────────────────────────────────
let realDir
try {
  realDir = realpathSync(pkgDir)
} catch {
  fail(`未找到已安装的插件目录：${pkgDir}`)
}
const installedPkg = JSON.parse(readFileSync(join(realDir, 'package.json'), 'utf8'))
log('校验通过：', installedPkg.name + '@' + installedPkg.version)
log('完成。web 组合禁用了 HMR，patch 层只在启动时生效：重启 `dsh web` 后刷新浏览器（F5）即可看到主题。')
log('自检：浏览器打开 http://127.0.0.1:3080/dafy-assets/whale_icon.png 应返回 image/png')
