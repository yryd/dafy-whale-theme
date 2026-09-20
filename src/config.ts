/**
 * 主题配置模型 —— 宿主端与客户端共用的纯函数层。
 *
 * 这个文件**不依赖任何运行时**（无 DOM、无 cordis、无 schemastery），
 * 因此可以被宿主（ESM）与客户端（CommonJS）同时编译，并且可以直接单测。
 *
 * 铁律：`DEFAULTS` 的每一个值都必须**逐字段等于改造前的现状**，
 * 这样「初版 = 当前主题 1:1 复现」才有保证（见 需求确认单.md）。
 */

/** 配置命名空间（宿主注册 + 客户端 bind 必须一致，由 check-schema-align.mjs 校验）。 */
export const SETTINGS_NAMESPACE = 'dafy-whale'

/** 可作水印的鲸鱼素材。 */
export type WatermarkAsset = 'whale_front.png' | 'whale_side.png' | 'whale_icon.png'

/** 可作小鱼贴图的素材。 */
export type FishAsset = 'fish_idle.png' | 'fish_happy.png'

/** 资源文件名联合类型。 */
export type AssetName = WatermarkAsset | FishAsset

/** 全部可调字段。 */
export interface WhaleConfig {
  // ---- 第 1 组：品牌区 ----
  /** 显示鲸鱼图标（品牌标记）。 */
  brandIconVisible: boolean
  /** 图标宽度 px（高度按 23.16:17.04 比例）。 */
  brandIconSize: number
  /** 显示品牌文字。 */
  brandTextVisible: boolean
  /** 品牌文字内容。 */
  brandText: string
  /** 品牌文字字号 px。 */
  brandTextSize: number
  /** 显示徽章（仿官方 buildVersion 样式）。默认关。 */
  brandBadgeVisible: boolean
  /** 徽章文字。 */
  brandBadgeText: string

  // ---- 第 2 组：配色 ----
  /** 亮色模式主色：改它 → 派生整套色阶。 */
  primaryLight: string
  /** 暗色模式主色。 */
  primaryDark: string

  // ---- 第 3 组：背景与氛围 ----
  /** 海面光晕开关。 */
  washEnabled: boolean
  /** 海面光晕强度 0–100（100 = 现状）。 */
  washStrength: number
  /** 背景水印（大鲸鱼）开关。 */
  watermarkVisible: boolean
  /** 水印透明度 0–0.3。 */
  watermarkOpacity: number
  /** 水印素材。 */
  watermarkAsset: WatermarkAsset

  // ---- 第 4 组：鱼群 ----
  /** 鱼群总开关。 */
  schoolEnabled: boolean
  /** 鱼群数量 0–12。 */
  fishCount: number
  /** 游动速度倍率 0.5–2（越大越快）。 */
  fishSpeedScale: number
  /** 鱼群透明度倍率 0–2。 */
  fishOpacityScale: number
  /** 鱼的大小倍率 0.5–2。 */
  fishSizeScale: number
  /** 显示大鲸鱼（whale_front）。 */
  showBigWhale: boolean
  /** 小鱼 idle 素材。 */
  fishIdleAsset: FishAsset
  /** 小鱼 happy 素材。 */
  fishHappyAsset: FishAsset
  /** 气泡开关。 */
  bubbleEnabled: boolean
  /** 气泡数量 0–30。 */
  bubbleCount: number
  /** 气泡速度倍率 0.5–2。 */
  bubbleSpeedScale: number

  // ---- 第 5 组：每日鱼语 ----
  /** 每日鱼语开关。 */
  dockEnabled: boolean
  /** 切换间隔 ms。 */
  dockIntervalMs: number
  /** 语录列表。 */
  dockLines: string[]
  /** 是否显示 🐋 表情。 */
  dockEmoji: boolean

  // ---- 第 6 组：界面 ----
  /** chip 文案（展开态，收起动作）。 */
  chipTextOn: string
  /** chip 文案（收起态，召唤动作）。 */
  chipTextOff: string
  /** 整体缩放 0.6–1.5。 */
  globalScale: number
}

/** 内置语录（改造前的 7 条）。 */
export const DEFAULT_DOCK_LINES: readonly string[] = [
  '你这吃白饭的蓝色大肥鱼，正在为您护航…',
  '鱼在深海里替您思考，请勿投喂。',
  '今日鱼语：V我 50 看看实力。',
  '所有计算都在肥肉里完成。',
  '咕噜咕噜…（翻译：正在努力干活）',
  '深海水压这么大，还不是被你催的。',
  '本鱼不发威，你当我是海豚？',
]

/**
 * 默认配置 —— **每一项都必须等于改造前的现状**。
 * 改这里的任何一个值都等于改变默认视觉，务必同步 需求确认单.md。
 */
export const DEFAULTS: WhaleConfig = {
  // 品牌区
  brandIconVisible: true,
  brandIconSize: 23,
  brandTextVisible: true,
  brandText: '蓝色大肥鱼',
  brandTextSize: 16,
  brandBadgeVisible: false,
  brandBadgeText: 'harness',

  // 配色
  primaryLight: '#3B62F6',
  primaryDark: '#6C8CFF',

  // 背景与氛围
  washEnabled: true,
  washStrength: 100,
  watermarkVisible: true,
  watermarkOpacity: 0.1,
  watermarkAsset: 'whale_side.png',

  // 鱼群
  schoolEnabled: true,
  fishCount: 5,
  fishSpeedScale: 1,
  fishOpacityScale: 1,
  fishSizeScale: 1,
  showBigWhale: true,
  fishIdleAsset: 'fish_idle.png',
  fishHappyAsset: 'fish_happy.png',
  bubbleEnabled: true,
  bubbleCount: 14,
  bubbleSpeedScale: 1,

  // 每日鱼语
  dockEnabled: true,
  dockIntervalMs: 9000,
  dockLines: [...DEFAULT_DOCK_LINES],
  dockEmoji: true,

  // 界面
  chipTextOn: '收起鱼群',
  chipTextOff: '召唤鱼群',
  globalScale: 1,
}

/** 数值字段的可调范围（UI 滑杆与 normalize 共用，保证两端一致）。 */
export const RANGES = {
  brandIconSize: { min: 16, max: 40, step: 1 },
  brandTextSize: { min: 12, max: 24, step: 1 },
  washStrength: { min: 0, max: 100, step: 1 },
  watermarkOpacity: { min: 0, max: 0.3, step: 0.01 },
  fishCount: { min: 0, max: 12, step: 1 },
  fishSpeedScale: { min: 0.5, max: 2, step: 0.05 },
  fishOpacityScale: { min: 0, max: 2, step: 0.05 },
  fishSizeScale: { min: 0.5, max: 2, step: 0.05 },
  bubbleCount: { min: 0, max: 30, step: 1 },
  bubbleSpeedScale: { min: 0.5, max: 2, step: 0.05 },
  dockIntervalMs: { min: 3000, max: 30000, step: 500 },
  globalScale: { min: 0.6, max: 1.5, step: 0.01 },
} as const

/** 数值字段名（用于 normalize 的通用处理）。 */
export type NumericField = keyof typeof RANGES

const WATERMARK_ASSETS: readonly WatermarkAsset[] = [
  'whale_front.png',
  'whale_side.png',
  'whale_icon.png',
]

const FISH_ASSETS: readonly FishAsset[] = ['fish_idle.png', 'fish_happy.png']

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return value < min ? min : value > max ? max : value
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asWatermarkAsset(value: unknown, fallback: WatermarkAsset): WatermarkAsset {
  return typeof value === 'string' && WATERMARK_ASSETS.includes(value as WatermarkAsset)
    ? (value as WatermarkAsset)
    : fallback
}

function asFishAsset(value: unknown, fallback: FishAsset): FishAsset {
  return typeof value === 'string' && FISH_ASSETS.includes(value as FishAsset)
    ? (value as FishAsset)
    : fallback
}

/** 校验 `#RRGGBB` 形式的颜色。 */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function asColor(value: unknown, fallback: string): string {
  return isHexColor(value) ? value : fallback
}

/**
 * 把任意（可能来自旧版本、被手改、或残缺的）输入规范化为完整配置。
 * 纯函数：同样的输入永远得到同样的输出，非法值一律回落默认值。
 */
export function normalizeConfig(raw: unknown): WhaleConfig {
  const input = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  const numeric = (field: NumericField): number => {
    const range = RANGES[field]
    const value = input[field]
    const fallback = DEFAULTS[field]
    return clamp(typeof value === 'number' ? value : fallback, range.min, range.max)
  }

  /**
   * 语录列表**保留原样**（含空行）——过滤放到渲染《每日鱼语》时做。
   *
   * 若在这里去掉空行，面板的 textarea 就会「吞输入」：用户按 Enter 产生的
   * 空行立刻被抹掉，于是**永远无法新增一条语录**（与 hex 输入框同一类缺陷）。
   * 数组为空表示用户主动清空，此时不显示鱼语。
   */
  const lines = Array.isArray(input.dockLines)
    ? input.dockLines.filter((line): line is string => typeof line === 'string')
    : [...DEFAULTS.dockLines]

  return {
    brandIconVisible: asBool(input.brandIconVisible, DEFAULTS.brandIconVisible),
    brandIconSize: numeric('brandIconSize'),
    brandTextVisible: asBool(input.brandTextVisible, DEFAULTS.brandTextVisible),
    brandText: asString(input.brandText, DEFAULTS.brandText),
    brandTextSize: numeric('brandTextSize'),
    brandBadgeVisible: asBool(input.brandBadgeVisible, DEFAULTS.brandBadgeVisible),
    brandBadgeText: asString(input.brandBadgeText, DEFAULTS.brandBadgeText),

    primaryLight: asColor(input.primaryLight, DEFAULTS.primaryLight),
    primaryDark: asColor(input.primaryDark, DEFAULTS.primaryDark),

    washEnabled: asBool(input.washEnabled, DEFAULTS.washEnabled),
    washStrength: numeric('washStrength'),
    watermarkVisible: asBool(input.watermarkVisible, DEFAULTS.watermarkVisible),
    watermarkOpacity: numeric('watermarkOpacity'),
    watermarkAsset: asWatermarkAsset(input.watermarkAsset, DEFAULTS.watermarkAsset),

    schoolEnabled: asBool(input.schoolEnabled, DEFAULTS.schoolEnabled),
    fishCount: numeric('fishCount'),
    fishSpeedScale: numeric('fishSpeedScale'),
    fishOpacityScale: numeric('fishOpacityScale'),
    fishSizeScale: numeric('fishSizeScale'),
    showBigWhale: asBool(input.showBigWhale, DEFAULTS.showBigWhale),
    fishIdleAsset: asFishAsset(input.fishIdleAsset, DEFAULTS.fishIdleAsset),
    fishHappyAsset: asFishAsset(input.fishHappyAsset, DEFAULTS.fishHappyAsset),
    bubbleEnabled: asBool(input.bubbleEnabled, DEFAULTS.bubbleEnabled),
    bubbleCount: numeric('bubbleCount'),
    bubbleSpeedScale: numeric('bubbleSpeedScale'),

    dockEnabled: asBool(input.dockEnabled, DEFAULTS.dockEnabled),
    dockIntervalMs: numeric('dockIntervalMs'),
    dockLines: lines,
    dockEmoji: asBool(input.dockEmoji, DEFAULTS.dockEmoji),

    chipTextOn: asString(input.chipTextOn, DEFAULTS.chipTextOn),
    chipTextOff: asString(input.chipTextOff, DEFAULTS.chipTextOff),
    globalScale: numeric('globalScale'),
  }
}

// ---------------------------------------------------------------------------
// 配色派生
// ---------------------------------------------------------------------------

/** 一个 token 的亮/暗两套取值。 */
export interface TokenModes {
  light: string
  dark: string
}

/** token 名 → 亮暗取值。 */
export type TokenOverrides = Record<string, TokenModes>

/**
 * 基准 token 表 —— 改造前的原始配色。
 *
 * 派生策略是**色相平移**：保持每个 token 原有的饱和度与亮度，只把色相
 * 按「新主色色相 − 基准主色色相」整体平移。因此：
 *   - 默认主色 → 位移为 0 → **精确还原**下面的原值（1:1 复现的关键）；
 *   - 换主色   → 所有派生 token 同步转向，原有明暗关系不变。
 *
 * 状态色（error/success/warn）**不参与派生**，语义色不该随主题漂移。
 */
export const BASE_TOKENS: Readonly<Record<string, TokenModes>> = {
  '--dsw-alias-brand-primary': { light: '#3B62F6', dark: '#6C8CFF' },
  '--dsw-alias-bg-base': { light: '#E9F3FC', dark: '#0A1428' },
  '--dsw-alias-bg-layer-1': { light: '#F3F9FE', dark: '#0F1E38' },
  '--dsw-alias-bg-layer-2': { light: '#E0EDF9', dark: '#0B1830' },
  '--dsw-alias-bg-overlay': { light: '#FFFFFF', dark: '#13233F' },
  '--dsw-alias-border-l1': { light: '#C6DCF2', dark: '#1D3252' },
  '--dsw-alias-border-l2': { light: '#9FC3E8', dark: '#2B4A78' },
  '--dsw-alias-label-primary': { light: '#0E2A5C', dark: '#DCEBFF' },
  '--dsw-alias-label-secondary': { light: '#45678F', dark: '#8FB0DC' },
  '--dsw-specific-sidebar-fill': { light: '#DCE9F8', dark: '#0C1830' },
  // 状态色：原值直出，不参与色相平移
  '--dsw-alias-state-error-primary': { light: '#D6456D', dark: '#FF7A93' },
  '--dsw-alias-state-success-primary': { light: '#1F9D72', dark: '#4BC49B' },
  '--dsw-alias-state-warn-primary': { light: '#B97A1E', dark: '#E8B45A' },
}

/** 不参与色相平移的 token（语义状态色）。 */
const HUE_LOCKED = new Set([
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
])

interface Hsl {
  h: number
  s: number
  l: number
}

/** `#RRGGBB` → HSL（h 为 0–360，s/l 为 0–1）。 */
export function hexToHsl(hex: string): Hsl {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  if (delta === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h: number
  if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / delta + 2) * 60
  else h = ((r - g) / delta + 4) * 60
  return { h, s, l }
}

function hue2rgb(p: number, q: number, t: number): number {
  let value = t
  if (value < 0) value += 1
  if (value > 1) value -= 1
  if (value < 1 / 6) return p + (q - p) * 6 * value
  if (value < 1 / 2) return q
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
  return p
}

/** HSL → `#RRGGBB`。 */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360 / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const to255 = (value: number): string =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to255(hue2rgb(p, q, hue + 1 / 3))}${to255(hue2rgb(p, q, hue))}${to255(hue2rgb(p, q, hue - 1 / 3))}`.toUpperCase()
}

/** 把颜色整体旋转 `delta` 度色相，保持 S/L。 */
export function shiftHue(hex: string, delta: number): string {
  if (delta === 0) return hex.toUpperCase()
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h + delta, s, l)
}

/**
 * 由主色派生全部 token。
 *
 * @param primaryLight 亮色模式主色（`#RRGGBB`）
 * @param primaryDark  暗色模式主色（`#RRGGBB`）
 * @returns 13 个 token 的亮/暗取值（其中 3 个状态色为固定原值）
 */
export function deriveTokens(primaryLight: string, primaryDark: string): TokenOverrides {
  const light = isHexColor(primaryLight) ? primaryLight : DEFAULTS.primaryLight
  const dark = isHexColor(primaryDark) ? primaryDark : DEFAULTS.primaryDark

  const baseLightHue = hexToHsl(DEFAULTS.primaryLight).h
  const baseDarkHue = hexToHsl(DEFAULTS.primaryDark).h
  const deltaLight = hexToHsl(light).h - baseLightHue
  const deltaDark = hexToHsl(dark).h - baseDarkHue

  const result: TokenOverrides = {}
  for (const [name, modes] of Object.entries(BASE_TOKENS)) {
    if (HUE_LOCKED.has(name)) {
      result[name] = { ...modes }
    } else if (name === '--dsw-alias-brand-primary') {
      // 主色本身直接用用户选的值，不经过平移（避免取整误差）
      result[name] = { light: light.toUpperCase(), dark: dark.toUpperCase() }
    } else {
      result[name] = {
        light: shiftHue(modes.light, deltaLight),
        dark: shiftHue(modes.dark, deltaDark),
      }
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// 鱼群 / 气泡的推导（把「数量 + 倍率」变成具体参数）
// ---------------------------------------------------------------------------

/** 单条鱼的渲染参数。 */
export interface FishSpec {
  src: string
  top: string
  size: number
  dur: number
  delay: number
  rev: boolean
  op: number
  big: boolean
}

/**
 * 基准鱼群 —— 改造前写死的 5 条，逐字段照抄。
 * `fishCount <= 5` 时取前 N 条，保证默认（5）与现状完全一致。
 */
export const BASE_FISH: readonly Omit<FishSpec, 'src'>[] = [
  { top: '14%', size: 56, dur: 64, delay: -12, rev: false, op: 0.16, big: false },
  { top: '38%', size: 46, dur: 82, delay: -40, rev: true, op: 0.14, big: false },
  { top: '62%', size: 52, dur: 74, delay: -25, rev: false, op: 0.15, big: false },
  { top: '80%', size: 42, dur: 95, delay: -60, rev: true, op: 0.12, big: false },
  { top: '46%', size: 170, dur: 120, delay: -80, rev: false, op: 0.1, big: true },
]

/** 大鲸鱼固定用 whale_front。 */
export const BIG_WHALE_TOP = '46%'

/**
 * 生成鱼群渲染参数。
 *
 * - `count <= 5`：取基准前 N 条（默认 5 → 与现状逐字段一致）
 * - `count > 5`：超出部分在基准基础上循环错位生成，避免看起来重复
 * - `showBigWhale === false`：剔除 big 条目
 */
export function buildFish(cfg: WhaleConfig): FishSpec[] {
  const specs: FishSpec[] = []
  const base = BASE_FISH.filter((fish) => cfg.showBigWhale || !fish.big)
  if (cfg.fishCount <= 0 || base.length === 0) return specs

  for (let i = 0; i < cfg.fishCount; i++) {
    const source = base[i % base.length]
    if (source === undefined) continue
    const cycle = Math.floor(i / base.length)
    const isBig = source.big
    specs.push({
      // 素材按「鱼的下标」交替（改造前就是 idle/happy/idle/happy 的节奏），
      // 不能用 cycle —— 否则第二、四条会错误地也用 idle。
      src: isBig ? 'whale_front.png' : i % 2 === 0 ? cfg.fishIdleAsset : cfg.fishHappyAsset,
      top: source.top,
      // 单鱼倍率 × 整体缩放
      size: round2(source.size * cfg.fishSizeScale * cfg.globalScale),
      // 倍率越大越快 → 时长取倒数
      dur: source.dur / cfg.fishSpeedScale,
      // 循环生成的条目错开延迟，避免重叠
      delay: source.delay - cycle * 7,
      rev: cycle % 2 === 0 ? source.rev : !source.rev,
      op: Math.min(1, source.op * cfg.fishOpacityScale),
      big: isBig,
    })
  }
  return specs
}

/** 气泡数量为 0 时返回空数组；否则沿用改造前的取模公式（尺寸再乘整体缩放）。 */
export function bubbleSpecs(cfg: WhaleConfig): { left: string; size: number; dur: number; delay: number }[] {
  const out: { left: string; size: number; dur: number; delay: number }[] = []
  if (!cfg.bubbleEnabled) return out
  for (let i = 0; i < cfg.bubbleCount; i++) {
    const size = round2((5 + ((i * 13) % 13)) * cfg.globalScale)
    out.push({
      left: `${(i * 7.31) % 100}%`,
      size,
      dur: (12 + ((i * 17) % 16)) / cfg.bubbleSpeedScale,
      delay: -((i * 11) % 30),
    })
  }
  return out
}

/** 保留两位小数的取整，避免 23 * 1.5 这类乘法产生 34.499999999999996。 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * 生成要写到 `<html>` 上的 CSS 变量（客户端与 boot 脚本共用）。
 *
 * ⚠️ `globalScale` 必须同时作用于品牌标记与品牌文字：
 * 它是「整体缩放」总控，只改 `--dafy-scale`（仅水印在用）会让另外三项纹丝不动。
 */
export function toCssVars(cfg: WhaleConfig): Record<string, string> {
  return {
    '--dafy-scale': String(cfg.globalScale),
    '--dafy-logo-size': `${round2(cfg.brandIconSize * cfg.globalScale)}px`,
    '--dafy-logo-text-size': `${round2(cfg.brandTextSize * cfg.globalScale)}px`,
    '--dafy-watermark-opacity': String(cfg.watermarkOpacity),
    '--dafy-wash-strength': String(cfg.washStrength / 100),
  }
}
