/**
 * dafy-whale-theme —— 宿主半。
 *
 * 三件事：
 *  1. **导出 `Config`** —— DSH 0.1.7 起，插件的配置 schema 由导出声明
 *     （旧的 `settings.register(ns, schema)` 已不存在）
 *  2. 声明 settings 呈现策略（`auto: false`，界面由我们自带）
 *  3. 为客户端提供 MIT 素材：`/dafy-assets/<name>`
 *
 * 客户端（`lib/client.cjs`）通过 `ctx.configForms.get(ENTRY_ID)` 读写同一份配置；
 * `ENTRY_ID` 必须等于 `cordis.patch.yml` 里的 `insert[].id`。
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { DEFAULTS, RANGES, ENTRY_ID } from './config.js'

export const name = 'dafy-whale-theme'

/** 宿主侧需要 webServer 提供素材路由；settings 走可选注入。 */
export const inject = ['webServer']

const here = dirname(fileURLToPath(import.meta.url))

const MIME: Record<string, string> = {
  '.png': 'image/png',
}

/** 允许经 `/dafy-assets/` 提供的文件白名单（硬编码即天然阻断路径穿越）。 */
const FILES = [
  'whale_front.png',
  'whale_side.png',
  'whale_icon.png',
  'fish_idle.png',
  'fish_happy.png',
]

const ALLOWED = new Set(FILES)

/**
 * 配置 schema —— 字段名与默认值必须与 `config.ts` 的 `DEFAULTS` 一致。
 * `scripts/check-schema-align.mjs` 会在构建后静态校验这一点。
 */
export const Config = z.object({
  // 第 1 组：品牌区
  brandIconVisible: z.boolean().default(DEFAULTS.brandIconVisible).volatile(),
  brandIconSize: z
    .number()
    .step(RANGES.brandIconSize.step)
    .min(RANGES.brandIconSize.min)
    .max(RANGES.brandIconSize.max)
    .default(DEFAULTS.brandIconSize).volatile(),
  brandTextVisible: z.boolean().default(DEFAULTS.brandTextVisible).volatile(),
  brandText: z.string().default(DEFAULTS.brandText).volatile(),
  brandTextSize: z
    .number()
    .step(RANGES.brandTextSize.step)
    .min(RANGES.brandTextSize.min)
    .max(RANGES.brandTextSize.max)
    .default(DEFAULTS.brandTextSize).volatile(),
  brandBadgeVisible: z.boolean().default(DEFAULTS.brandBadgeVisible).volatile(),
  brandBadgeText: z.string().default(DEFAULTS.brandBadgeText).volatile(),

  // 第 2 组：配色
  primaryLight: z.string().default(DEFAULTS.primaryLight).volatile(),
  primaryDark: z.string().default(DEFAULTS.primaryDark).volatile(),

  // 第 3 组：背景与氛围
  washEnabled: z.boolean().default(DEFAULTS.washEnabled).volatile(),
  washStrength: z
    .number()
    .step(RANGES.washStrength.step)
    .min(RANGES.washStrength.min)
    .max(RANGES.washStrength.max)
    .default(DEFAULTS.washStrength).volatile(),
  watermarkVisible: z.boolean().default(DEFAULTS.watermarkVisible).volatile(),
  watermarkOpacity: z
    .number()
    .step(RANGES.watermarkOpacity.step)
    .min(RANGES.watermarkOpacity.min)
    .max(RANGES.watermarkOpacity.max)
    .default(DEFAULTS.watermarkOpacity).volatile(),
  watermarkAsset: z
    .union(['whale_front.png', 'whale_side.png', 'whale_icon.png'])
    .default(DEFAULTS.watermarkAsset).volatile(),

  // 第 4 组：鱼群
  schoolEnabled: z.boolean().default(DEFAULTS.schoolEnabled).volatile(),
  fishCount: z
    .number()
    .step(RANGES.fishCount.step)
    .min(RANGES.fishCount.min)
    .max(RANGES.fishCount.max)
    .default(DEFAULTS.fishCount).volatile(),
  fishSpeedScale: z
    .number()
    .step(RANGES.fishSpeedScale.step)
    .min(RANGES.fishSpeedScale.min)
    .max(RANGES.fishSpeedScale.max)
    .default(DEFAULTS.fishSpeedScale).volatile(),
  fishOpacityScale: z
    .number()
    .step(RANGES.fishOpacityScale.step)
    .min(RANGES.fishOpacityScale.min)
    .max(RANGES.fishOpacityScale.max)
    .default(DEFAULTS.fishOpacityScale).volatile(),
  fishSizeScale: z
    .number()
    .step(RANGES.fishSizeScale.step)
    .min(RANGES.fishSizeScale.min)
    .max(RANGES.fishSizeScale.max)
    .default(DEFAULTS.fishSizeScale).volatile(),
  showBigWhale: z.boolean().default(DEFAULTS.showBigWhale).volatile(),
  fishIdleAsset: z.union(['fish_idle.png', 'fish_happy.png']).default(DEFAULTS.fishIdleAsset).volatile(),
  fishHappyAsset: z.union(['fish_idle.png', 'fish_happy.png']).default(DEFAULTS.fishHappyAsset).volatile(),
  bubbleEnabled: z.boolean().default(DEFAULTS.bubbleEnabled).volatile(),
  bubbleCount: z
    .number()
    .step(RANGES.bubbleCount.step)
    .min(RANGES.bubbleCount.min)
    .max(RANGES.bubbleCount.max)
    .default(DEFAULTS.bubbleCount).volatile(),
  bubbleSpeedScale: z
    .number()
    .step(RANGES.bubbleSpeedScale.step)
    .min(RANGES.bubbleSpeedScale.min)
    .max(RANGES.bubbleSpeedScale.max)
    .default(DEFAULTS.bubbleSpeedScale).volatile(),

  // 第 5 组：每日鱼语
  dockEnabled: z.boolean().default(DEFAULTS.dockEnabled).volatile(),
  dockIntervalMs: z
    .number()
    .step(RANGES.dockIntervalMs.step)
    .min(RANGES.dockIntervalMs.min)
    .max(RANGES.dockIntervalMs.max)
    .default(DEFAULTS.dockIntervalMs).volatile(),
  dockLines: z.array(z.string()).default([...DEFAULTS.dockLines]).volatile(),
  dockEmoji: z.boolean().default(DEFAULTS.dockEmoji).volatile(),

  // 第 6 组：界面
  chipTextOn: z.string().default(DEFAULTS.chipTextOn).volatile(),
  chipTextOff: z.string().default(DEFAULTS.chipTextOff).volatile(),
  globalScale: z
    .number()
    .step(RANGES.globalScale.step)
    .min(RANGES.globalScale.min)
    .max(RANGES.globalScale.max)
    .default(DEFAULTS.globalScale).volatile(),
})

/** 宿主侧用到的最小上下文面（只声明实际用到的成员）。 */
interface AssetRoute {
  kind: 'prefix'
  path: string
  handler(req: { method?: string; url?: string }, res: RouteResponse): Promise<void> | void
}

interface RouteResponse {
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: unknown): void
}

interface WebserverService {
  register(route: AssetRoute): () => void
}

/**
 * 宿主端 settings 服务（DSH 0.1.7 形态）。
 *
 * ⚠️ 0.1.6 的 `register(namespace, schema)` **已被移除**。新模型下：
 *   - schema 由本模块**导出 `Config`** 声明；
 *   - 命名空间 = 插件条目 id（`ENTRY_ID`），不再由插件自定义；
 *   - 这里只声明**呈现策略**（`auto`）。
 */
interface SettingsService {
  /**
   * @param presentation.auto `false` = 不让 DSH 自动生成表单（我们自带面板）
   * @param owner 本插件的 fiber；省略时默认调用者的 ctx.fiber
   * @returns 注销该策略的清理函数
   */
  configure(presentation: { auto: boolean }, owner?: unknown): () => void
}

interface HostContext {
  effect(fn: () => void | (() => void), label?: string): void
  inject(names: string[], callback: (ctx: HostContext) => void): void
  get(name: string): unknown
  webServer: WebserverService
  /** 本插件的 fiber：`configure` 用它标识「这条呈现策略属于谁」。 */
  fiber: unknown
}

export function apply(ctx: HostContext, _entryConfig: Record<string, unknown> = {}): void {
  // ---- 1. 声明 settings 呈现策略（DSH 0.1.7）----
  // schema 已由本模块导出的 `Config` 声明；这里只声明「界面不由 DSH 自动生成」
  // （auto: false），因为我们自带「设置 → 海洋主题」面板（见 src/client.tsx）。
  // settings 服务可选：未组合时主题仍以默认值工作。
  ctx.inject(['settings'], (settingsCtx) => {
    const settings = settingsCtx.get('settings') as SettingsService | undefined
    if (settings === undefined) return
    ctx.effect(
      () => settings.configure({ auto: false }, ctx.fiber),
      'dafy-whale-theme settings presentation',
    )
  })

  // ---- 2. 素材路由（保持改造前行为：白名单 + MIME + 404 兜底）----
  const route: AssetRoute = {
    kind: 'prefix',
    path: '/dafy-assets',
    async handler(req, res) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
      const prefix = '/dafy-assets/'
      const fileName = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ''
      if (!ALLOWED.has(fileName)) {
        res.writeHead(404)
        res.end()
        return
      }
      try {
        const body = await readFile(join(here, '..', 'assets', fileName))
        const ext = fileName.slice(fileName.lastIndexOf('.'))
        res.writeHead(200, {
          'content-type': MIME[ext] ?? 'application/octet-stream',
          'cache-control': 'public, max-age=86400',
        })
        res.end(body)
      } catch {
        res.writeHead(404)
        res.end()
      }
    },
  }
  ctx.effect(() => ctx.webServer.register(route))
}

export { ENTRY_ID }
