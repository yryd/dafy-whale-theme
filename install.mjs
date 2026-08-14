#!/usr/bin/env node
// dafy-whale-theme 安装脚本
//
// 用法：
//   node install.mjs                 # 装到 $DSH_HOME/profiles/web
//   node install.mjs --profile web   # 指定 profile
//   node install.mjs --home <dir>    # 覆盖 DSH_HOME（测试用）
//
// 通路（幂等，两条通路互斥，重复执行不会重复挂载）：
//   1. 官方通路：本包声明了 dsh.bundle（见 package.json 与 cordis.patch.yml），
//      优先调用 `dsh plugin --profile <name> add <本仓库>` —— 官方 CLI 负责
//      依赖安装与组合层收编，升级也可用 `dsh plugin ... update`。
//   2. 手动通路：dsh CLI / pnpm 不可用时回退，按 package.json 的 files 白名单
//      复制插件到 profile 的 node_modules，并在 cordis.patch.yml 写入挂载行
//      （正确处理模板自带的 `[]` 占位，不再产生非法 YAML）。
// 两条通路完成后都会自动补齐扩展素材并自检。

import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, statSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
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
const home = opt('home', process.env.DSH_HOME ?? join(os.homedir(), '.dsh'))
const here = dirname(fileURLToPath(import.meta.url))

const profileDir = join(home, 'profiles', profile)
const patchPath = join(profileDir, 'cordis.patch.yml')
const dest = join(profileDir, 'node_modules', PKG_NAME)

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

// ── 2. 挂载（幂等：任一通路已挂载则跳过；手动通路会同步包文件） ────────
const mounted = mountedPath()
if (mounted === 'official') {
  log('已通过官方通路安装（依赖/组合层已含本包），跳过；升级请用 `dsh plugin --profile', profile, 'update', PKG_NAME + '`')
} else if (mounted === 'manual') {
  log('已通过手动通路安装（挂载行已存在），同步包文件')
  copyFiles()
} else {
  install()
}

// ── 3. 自动补齐扩展素材 ───────────────────────────────────────────────────
// 这些文件因许可原因不随仓库分发（见 NOTICE），安装时统一从源仓库获取，
// 用户无需做任何选择；获取失败时吉祥物会自动回退为 emoji，重跑本脚本即可重试。
const EXTRA = {
  'girl_idle.gif': 'https://raw.githubusercontent.com/xpy12367/codex-pet-DeepSeek-girl/main/previews/idle.gif',
  'girl_waving.gif': 'https://raw.githubusercontent.com/xpy12367/codex-pet-DeepSeek-girl/main/previews/waving.gif',
  'girl_running.gif': 'https://raw.githubusercontent.com/xpy12367/codex-pet-DeepSeek-girl/main/previews/running.gif',
}
// 跟随 pnpm 的符号链接布局，写进真实包目录。
let assetDir
try {
  assetDir = realpathSync(dest)
} catch {
  fail(`已安装的插件目录不存在：${dest}`)
}
mkdirSync(join(assetDir, 'assets'), { recursive: true })
for (const [name, url] of Object.entries(EXTRA)) {
  const target = join(assetDir, 'assets', name)
  if (existsSync(target) && statSync(target).size > 0) {
    log('素材已存在，跳过', name)
    continue
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(target, buf)
    log('已下载', name, buf.length, 'bytes')
  } catch (err) {
    log('下载失败', name, ':', err && err.message ? err.message : err, '（吉祥物将回退为 emoji，稍后重跑本脚本即可重试）')
  }
}

// ── 4. 校验与后续提示 ─────────────────────────────────────────────────────
const installedPkg = JSON.parse(readFileSync(join(assetDir, 'package.json'), 'utf8'))
log('校验通过：', installedPkg.name + '@' + installedPkg.version)
log('完成。web 组合禁用了 HMR，patch 层只在启动时生效：重启 `dsh web` 后刷新浏览器（F5）即可看到主题。')
log('自检：浏览器打开 http://127.0.0.1:3080/dafy-assets/whale_icon.png 应返回 image/png')

// ── 实现 ──────────────────────────────────────────────────────────────────

/** 官方通路：依赖或组合层已含本包；手动通路：用户 patch 层已有本包行。 */
function mountedPath() {
  try {
    const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
    if (Object.keys(manifest.dependencies ?? {}).includes(PKG_NAME)) return 'official'
    if ((manifest.dsh?.profile?.bundles ?? []).includes(PKG_NAME)) return 'official'
  } catch {
    // 读不了 manifest 时交给后续步骤报错
  }
  if (existsSync(patchPath)) {
    const text = readFileSync(patchPath, 'utf8')
    if (new RegExp('^\\s*-\\s+id:\\s*' + PKG_NAME + '\\s*$', 'm').test(text)) return 'manual'
  }
  return null
}

function install() {
  // 官方通路：dsh plugin 负责依赖安装 + 组合层收编（本包声明了 dsh.bundle）。
  const run = spawnSync('dsh', ['plugin', '--profile', profile, 'add', here], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (!run.error && run.status === 0) {
    log('已通过官方通路安装：dsh plugin --profile', profile, 'add', here)
    return
  }
  const why = run.error !== undefined ? run.error.code : 'exit ' + run.status
  log('`dsh plugin` 不可用（' + why + '），回退到手动挂载')
  manualInstall()
}

function manualInstall() {
  copyFiles()
  writePatchRow()
}

/** 复制插件：按 package.json 的 files 白名单（跨平台、不含 .git）。
 *  package.json 始终包含（npm 打包语义：manifest 永不被 files 排除，
 *  且 Loader 正是靠它解析 main/exports/dsh 元数据）。 */
function copyFiles() {
  if (resolve(here) === resolve(dest)) {
    log('脚本与安装位置相同，跳过复制')
    return
  }
  const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'))
  const files = Array.isArray(pkg.files) && pkg.files.length > 0 ? pkg.files : null
  const entries = files === null ? null : ['package.json', ...files.filter((f) => f !== 'package.json')]
  // 手动通路下脚本完全拥有该目录：先整体重建，杜绝旧版本残留文件（如
  // 老脚本漏进的 .git），再按白名单复制。
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  if (entries === null) {
    cpSync(here, dest, { recursive: true, filter: skipJunk })
  } else {
    for (const rel of entries) {
      const src = join(here, rel)
      if (!existsSync(src)) continue
      mkdirSync(dirname(join(dest, rel)), { recursive: true })
      cpSync(src, join(dest, rel), { recursive: true, filter: skipJunk })
    }
  }
  log('已复制插件到', dest)
}

/** 写入挂载行。模板自带的 cordis.patch.yml 顶层是 `[]` 占位：YAML 里
 *  不能在其后再追加条目，必须用本包行替换掉占位；已有其它条目时则在末尾追加。 */
function writePatchRow() {
  const block = [
    '# 蓝色大肥鱼主题（' + PKG_NAME + '）。',
    '- insert:',
    '    - id: ' + PKG_NAME,
    '      name: ' + PKG_NAME,
    '',
  ].join('\n')
  if (!existsSync(patchPath)) {
    writeFileSync(patchPath, block)
    log('已创建', patchPath, '并写入挂载行')
    return
  }
  const text = readFileSync(patchPath, 'utf8')
  const contentOnly = text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim()
      return t !== '' && !t.startsWith('#')
    })
    .join('')
  if (contentOnly === '[]') {
    writeFileSync(patchPath, text.replace(/\[\]\s*$/, '').replace(/\s*$/, '\n') + block)
    log('已用挂载行替换', patchPath, '中的 `[]` 占位')
  } else {
    writeFileSync(patchPath, text.replace(/\s*$/, '\n\n') + block)
    log('已向', patchPath, '追加挂载行')
  }
}

/** 复制过滤器：排除 .git 与打包产物（路径分隔符无关）。 */
function skipJunk(src) {
  return !/[\\/]\.git[\\/]/.test(src) && !src.endsWith('.tgz')
}
