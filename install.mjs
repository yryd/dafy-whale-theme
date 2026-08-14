#!/usr/bin/env node
// dafy-whale-theme 一键安装脚本
//
// 用法（由 DSH agent 或用户直接执行）:
//   node install.mjs                      # 装到 $DSH_HOME/profiles/web
//   node install.mjs --profile web        # 同左，显式指定 profile
//   node install.mjs --fetch-extra        # 额外从源仓库拉取 DeepSeek娘 GIF（无许可证素材，需自担）
//   node install.mjs --home <dir>         # 覆盖 DSH_HOME（测试用）
//
// 幂等：重复执行不会重复写 patch 行。

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cpSync } from 'node:fs'
import os from 'node:os'

const args = process.argv.slice(2)
function opt(name, def) {
  const i = args.indexOf('--' + name)
  return i >= 0 && typeof args[i + 1] === 'string' ? args[i + 1] : def
}
function flag(name) {
  return args.includes('--' + name)
}

const PKG_NAME = 'dafy-whale-theme'
const profile = opt('profile', 'web')
const home = opt('home', process.env.DSH_HOME ?? join(os.homedir(), '.dsh'))
const here = dirname(fileURLToPath(import.meta.url))

const profileDir = join(home, 'profiles', profile)
const dest = join(profileDir, 'node_modules', PKG_NAME)

function log(...parts) {
  console.log('[dafy]', ...parts)
}

// 1. profile 完整性检查
if (!existsSync(join(profileDir, 'package.json'))) {
  console.error(`[dafy] 未找到 profile：${profileDir}`)
  console.error('[dafy] 请先运行一次 `dsh web`（初始化 web profile）后再安装。')
  process.exit(1)
}

// 2. 复制插件（跳过 .git / tarball；同路径则跳过）
if (resolve(here) !== resolve(dest)) {
  cpSync(here, dest, {
    recursive: true,
    filter: (src) => !src.includes('/.git/') && !src.endsWith('.tgz'),
  })
  log('已复制插件到', dest)
} else {
  log('脚本与安装位置相同，跳过复制')
}

// 3. 幂等写入 cordis.patch.yml 挂载行
const patchPath = join(profileDir, 'cordis.patch.yml')
let yml = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
if (new RegExp('\\b' + PKG_NAME + '\\b').test(yml)) {
  log('patch 挂载行已存在，跳过')
} else {
  const row = [
    '',
    '# 蓝色大肥鱼主题（' + PKG_NAME + '）：宿主半部注册 /dafy-assets 素材路由。',
    '- insert:',
    '    - id: ' + PKG_NAME,
    '      name: ' + PKG_NAME,
    '',
  ].join('\n')
  writeFileSync(patchPath, yml.replace(/\s*$/, '\n') + row)
  log('已向', patchPath, '追加挂载行')
}

// 4. 可选：按需从源仓库拉取无许可证素材（DeepSeek娘 GIF）
//    这些文件不随仓库分发；由用户/agent 显式执行本步时自行下载。
if (flag('fetch-extra')) {
  const base = 'https://raw.githubusercontent.com/xpy12367/codex-pet-DeepSeek-girl/main/previews/'
  const extra = { 'girl_idle.gif': 'idle.gif', 'girl_waving.gif': 'waving.gif', 'girl_running.gif': 'running.gif' }
  mkdirSync(join(dest, 'assets'), { recursive: true })
  for (const [target, source] of Object.entries(extra)) {
    try {
      const res = await fetch(base + source)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const buf = Buffer.from(await res.arrayBuffer())
      writeFileSync(join(dest, 'assets', target), buf)
      log('已下载', target, buf.length, 'bytes')
    } catch (err) {
      log('下载失败', source, ':', err && err.message ? err.message : err)
    }
  }
}

// 5. 校验与后续提示
const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
log('校验通过：', pkg.name + '@' + pkg.version)
log('完成。patch 监视器会自动热应用宿主路由；刷新浏览器页面（F5）即可看到主题。')
log('自检：浏览器打开 http://127.0.0.1:3080/dafy-assets/whale_icon.png 应返回 image/png')
