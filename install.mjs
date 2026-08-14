#!/usr/bin/env node
// dafy-whale-theme 一键安装脚本
//
// 用法：
//   node install.mjs                 # 装到 $DSH_HOME/profiles/web
//   node install.mjs --profile web   # 指定 profile
//   node install.mjs --home <dir>    # 覆盖 DSH_HOME（测试用）
//
// 唯一默认通路，无任何可选项：复制插件 → 写挂载行 → 自动补齐全部素材 → 校验。
// 幂等：重复执行不会重复写 patch、不会重复下载素材。

import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

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

// 2. 复制插件（同路径则跳过）
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
    '# 蓝色大肥鱼主题（' + PKG_NAME + '）。',
    '- insert:',
    '    - id: ' + PKG_NAME,
    '      name: ' + PKG_NAME,
    '',
  ].join('\n')
  writeFileSync(patchPath, yml.replace(/\s*$/, '\n') + row)
  log('已向', patchPath, '追加挂载行')
}

// 4. 自动补齐扩展素材
//    这些文件因许可原因不随仓库分发（见 NOTICE），安装时统一从源仓库获取，
//    用户无需做任何选择；获取失败时吉祥物会自动回退为 emoji，重跑本脚本即可重试。
const EXTRA = {
  'girl_idle.gif': 'https://raw.githubusercontent.com/xpy12367/codex-pet-DeepSeek-girl/main/previews/idle.gif',
  'girl_waving.gif': 'https://raw.githubusercontent.com/xpy12367/codex-pet-DeepSeek-girl/main/previews/waving.gif',
  'girl_running.gif': 'https://raw.githubusercontent.com/xpy12367/codex-pet-DeepSeek-girl/main/previews/running.gif',
}
mkdirSync(join(dest, 'assets'), { recursive: true })
for (const [name, url] of Object.entries(EXTRA)) {
  const target = join(dest, 'assets', name)
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

// 5. 校验与后续提示
const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
log('校验通过：', pkg.name + '@' + pkg.version)
log('完成。patch 监视器会自动热应用宿主路由；刷新浏览器页面（F5）即可看到主题。')
log('自检：浏览器打开 http://127.0.0.1:3080/dafy-assets/whale_icon.png 应返回 image/png')
