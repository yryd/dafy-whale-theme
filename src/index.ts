/**
 * dafy-whale-theme —— 宿主半。
 *
 * 两件事：
 *  1. 在 DSH 用户设置文档里注册 `dafy-whale` 命名空间（schema 即配置契约）
 *  2. 为客户端提供 MIT 素材：`/dafy-assets/<name>`
 *
 * 客户端（`lib/client.cjs`）通过 `ctx.settingsScope.bind({ namespace })` 读写本命名空间。
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { DEFAULTS, RANGES, SETTINGS_NAMESPACE } from './config.js'

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
export const ConfigSchema = z.object({
  // 第 1 组：品牌区
  brandIconVisible: z.boolean().default(DEFAULTS.brandIconVisible),
  brandIconSize: z
    .number()
    .step(RANGES.brandIconSize.step)
    .min(RANGES.brandIconSize.min)
    .max(RANGES.brandIconSize.max)
    .default(DEFAULTS.brandIconSize),
  brandTextVisible: z.boolean().default(DEFAULTS.brandTextVisible),
  brandText: z.string().default(DEFAULTS.brandText),
  brandTextSize: z
    .number()
    .step(RANGES.brandTextSize.step)
    .min(RANGES.brandTextSize.min)
    .max(RANGES.brandTextSize.max)
    .default(DEFAULTS.brandTextSize),
  brandBadgeVisible: z.boolean().default(DEFAULTS.brandBadgeVisible),
  brandBadgeText: z.string().default(DEFAULTS.brandBadgeText),

  // 第 2 组：配色
  primaryLight: z.string().default(DEFAULTS.primaryLight),
  primaryDark: z.string().default(DEFAULTS.primaryDark),

  // 第 3 组：背景与氛围
  washEnabled: z.boolean().default(DEFAULTS.washEnabled),
  washStrength: z
    .number()
    .step(RANGES.washStrength.step)
    .min(RANGES.washStrength.min)
    .max(RANGES.washStrength.max)
    .default(DEFAULTS.washStrength),
  watermarkVisible: z.boolean().default(DEFAULTS.watermarkVisible),
  watermarkOpacity: z
    .number()
    .step(RANGES.watermarkOpacity.step)
    .min(RANGES.watermarkOpacity.min)
    .max(RANGES.watermarkOpacity.max)
    .default(DEFAULTS.watermarkOpacity),
  watermarkAsset: z
    .union(['whale_front.png', 'whale_side.png', 'whale_icon.png'])
    .default(DEFAULTS.watermarkAsset),

  // 第 4 组：鱼群
  schoolEnabled: z.boolean().default(DEFAULTS.schoolEnabled),
  fishCount: z
    .number()
    .step(RANGES.fishCount.step)
    .min(RANGES.fishCount.min)
    .max(RANGES.fishCount.max)
    .default(DEFAULTS.fishCount),
  fishSpeedScale: z
    .number()
    .step(RANGES.fishSpeedScale.step)
    .min(RANGES.fishSpeedScale.min)
    .max(RANGES.fishSpeedScale.max)
    .default(DEFAULTS.fishSpeedScale),
  fishOpacityScale: z
    .number()
    .step(RANGES.fishOpacityScale.step)
    .min(RANGES.fishOpacityScale.min)
    .max(RANGES.fishOpacityScale.max)
    .default(DEFAULTS.fishOpacityScale),
  fishSizeScale: z
    .number()
    .step(RANGES.fishSizeScale.step)
    .min(RANGES.fishSizeScale.min)
    .max(RANGES.fishSizeScale.max)
    .default(DEFAULTS.fishSizeScale),
  showBigWhale: z.boolean().default(DEFAULTS.showBigWhale),
  fishIdleAsset: z.union(['fish_idle.png', 'fish_happy.png']).default(DEFAULTS.fishIdleAsset),
  fishHappyAsset: z.union(['fish_idle.png', 'fish_happy.png']).default(DEFAULTS.fishHappyAsset),
  bubbleEnabled: z.boolean().default(DEFAULTS.bubbleEnabled),
  bubbleCount: z
    .number()
    .step(RANGES.bubbleCount.step)
    .min(RANGES.bubbleCount.min)
    .max(RANGES.bubbleCount.max)
    .default(DEFAULTS.bubbleCount),
  bubbleSpeedScale: z
    .number()
    .step(RANGES.bubbleSpeedScale.step)
    .min(RANGES.bubbleSpeedScale.min)
    .max(RANGES.bubbleSpeedScale.max)
    .default(DEFAULTS.bubbleSpeedScale),

  // 第 5 组：每日鱼语
  dockEnabled: z.boolean().default(DEFAULTS.dockEnabled),
  dockIntervalMs: z
    .number()
    .step(RANGES.dockIntervalMs.step)
    .min(RANGES.dockIntervalMs.min)
    .max(RANGES.dockIntervalMs.max)
    .default(DEFAULTS.dockIntervalMs),
  dockLines: z.array(z.string()).default([...DEFAULTS.dockLines]),
  dockEmoji: z.boolean().default(DEFAULTS.dockEmoji),

  // 第 6 组：界面
  chipTextOn: z.string().default(DEFAULTS.chipTextOn),
  chipTextOff: z.string().default(DEFAULTS.chipTextOff),
  globalScale: z
    .number()
    .step(RANGES.globalScale.step)
    .min(RANGES.globalScale.min)
    .max(RANGES.globalScale.max)
    .default(DEFAULTS.globalScale),
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

interface SettingsService {
  register(namespace: string, schema: unknown): void
}

interface HostContext {
  effect(fn: () => void | (() => void)): void
  inject(names: string[], callback: (ctx: HostContext) => void): void
  get(name: string): unknown
  webServer: WebserverService
}

export function apply(ctx: HostContext): void {
  // ---- 1. 注册配置命名空间（settings 服务可选：未组合时主题仍以默认值工作）----
  ctx.inject(['settings'], (settingsCtx) => {
    const settings = settingsCtx.get('settings') as SettingsService | undefined
    if (settings === undefined) return
    settings.register(SETTINGS_NAMESPACE, ConfigSchema)
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

export { SETTINGS_NAMESPACE }
