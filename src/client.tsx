/**
 * dafy-whale-theme —— 客户端半。
 *
 * 由 DSH 客户端 ModuleLoader 加载（构建产物为 lib/client.cjs）。
 * 职责：
 *  1. 注册主题 token（海洋蓝，可调主色）
 *  2. 注册 5 个插槽：鱼群 / 每日鱼语 / chip / 品牌标记 / 品牌文字
 *  3. 注册「设置 → 海洋主题」面板，配置即时生效并持久化
 *
 * 配置读写走官方 settingsScope；改动**即时生效**（无草稿层）。
 */

import * as React from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  DEFAULTS,
  RANGES,
  SETTINGS_NAMESPACE,
  bubbleSpecs,
  buildFish,
  deriveTokens,
  normalizeConfig,
  toCssVars,
  type FishAsset,
  type WatermarkAsset,
  type WhaleConfig,
} from './config.js'
import { FISH_LOGO_PATH, FISH_LOGO_VIEWBOX } from './logo-path.js'

// ---------------------------------------------------------------------------
// DSH 客户端运行时接口（只声明本插件实际用到的成员）
// ---------------------------------------------------------------------------

/** 一个主题 token 的亮/暗取值。 */
interface TokenModes {
  light: string
  dark: string
}

interface ThemeService {
  /** 叠加一层 token 覆盖。source 会被 DSH 强制替换为包 id，同包重复调用互相替换。 */
  overrideTokens(source: string, tokens: Record<string, TokenModes>): () => void
}

interface SlotsService {
  inject(name: string, setup: () => unknown): unknown
  register(options: Record<string, unknown>, component: unknown): unknown
}

interface ClientContext {
  effect(fn: () => void | (() => void), label?: string): void
  slots: SlotsService
  theme: ThemeService
  settingsScope: {
    bind<T>(spec: { namespace: string }): SettingsScope<T>
  }
}

export const inject = ['slots', 'theme', 'settingsScope']

// ---------------------------------------------------------------------------
// 配置 store：单一真源，组件经 useSyncExternalStore 订阅
// ---------------------------------------------------------------------------

let current: WhaleConfig = { ...DEFAULTS }
const listeners = new Set<() => void>()

function getConfig(): WhaleConfig {
  return current
}

function subscribeConfig(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function publish(next: WhaleConfig): void {
  current = next
  for (const listener of listeners) listener()
}

function useConfig(): WhaleConfig {
  return React.useSyncExternalStore(subscribeConfig, getConfig, getConfig)
}

/** 设置命名空间句柄（apply 时绑定）。 */
let scope: SettingsScope<WhaleConfig> | undefined
/** 客户端上下文（供样式/令牌应用使用）。 */
let clientCtx: ClientContext | undefined

/** 写回一个字段：本地立即生效 + 异步持久化。 */
function setField<K extends keyof WhaleConfig>(field: K, value: WhaleConfig[K]): void {
  const next = normalizeConfig({ ...current, [field]: value })
  publish(next)
  applyTheme(next)
  void scope?.set(field, next[field])
}

/** 恢复全部默认值。 */
function resetAll(): void {
  const next = normalizeConfig(DEFAULTS)
  publish(next)
  applyTheme(next)
  for (const field of Object.keys(DEFAULTS) as (keyof WhaleConfig)[]) {
    void scope?.set(field, next[field])
  }
}

// ---------------------------------------------------------------------------
// 主题应用
// ---------------------------------------------------------------------------

let themeTimer: ReturnType<typeof setTimeout> | undefined

/**
 * 把配置应用到界面。
 *
 * CSS 变量立即写（滑杆拖动时逐帧跟手）；token 覆盖做 200ms 防抖——
 * 因为 DSH 每次 `overrideTokens` 调用都会在 fiber 上登记一个 effect，
 * 逐帧调用会累积大量无效 effect。
 */
function applyTheme(cfg: WhaleConfig): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [name, value] of Object.entries(toCssVars(cfg))) {
    root.style.setProperty(name, value)
  }
  if (themeTimer !== undefined) clearTimeout(themeTimer)
  themeTimer = setTimeout(() => {
    if (clientCtx === undefined) return
    clientCtx.theme.overrideTokens('dafy', deriveTokens(cfg.primaryLight, cfg.primaryDark))
  }, 200)
}

// ---------------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------------

const LOGO_MARK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FISH_LOGO_VIEWBOX}"><path fill="black" d="${FISH_LOGO_PATH}"/></svg>`,
)}") center / contain no-repeat`

const CSS = `
.dafy-school { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
.dafy-wash {
  position: absolute; inset: 0;
  background:
    radial-gradient(1100px 620px at 88% -8%, color-mix(in srgb, #3B62F6 30%, transparent), transparent 62%),
    radial-gradient(900px 560px at -6% 108%, color-mix(in srgb, #57C7E8 26%, transparent), transparent 58%),
    radial-gradient(520px 340px at 50% 46%, color-mix(in srgb, #2FD0B5 14%, transparent), transparent 70%);
  mix-blend-mode: soft-light;
  opacity: var(--dafy-wash-strength, 1);
}
.dafy-watermark {
  position: absolute; right: -3vw; bottom: -8vh;
  height: calc(74vh * var(--dafy-scale, 1)); width: auto;
  opacity: var(--dafy-watermark-opacity, .1); pointer-events: none;
}
.dafy-bubble-p {
  position: absolute; bottom: -30px; border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, rgba(255,255,255,.9), rgba(120,190,255,.15) 72%);
  border: 1px solid rgba(110,180,255,.45);
  animation: dafy-rise linear infinite;
}
@keyframes dafy-rise {
  0% { transform: translateY(0); opacity: 0; }
  8% { opacity: .5; }
  90% { opacity: .3; }
  100% { transform: translateY(-108vh); opacity: 0; }
}
.dafy-fish { position: absolute; left: 0; transform: translateX(-24vw); animation: dafy-swim linear infinite; pointer-events: none; }
.dafy-fish-rev { animation-direction: reverse; }
.dafy-fish-big { filter: drop-shadow(0 10px 26px rgba(20,80,180,.35)); }
@keyframes dafy-swim {
  from { transform: translateX(-24vw); }
  to { transform: translateX(112vw); }
}
@keyframes dafy-pop { from { transform: translateY(8px) scale(.9); opacity: 0; } }
.dafy-dock { display: flex; justify-content: center; padding: 2px 0 6px; }
.dafy-dock-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 3px 12px; border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 80%, transparent);
  border: 1px solid var(--dsw-alias-border-l1);
  font-size: 12px; color: var(--dsw-alias-label-secondary);
}
.dafy-dock-emoji { font-size: 14px; }
.dafy-dock-text { display: inline-block; animation: dafy-pop .3s ease; }
.dafy-chip { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; padding: 2px 4px; border-radius: 8px; max-width: 100%; overflow: hidden; }
.dafy-chip:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); }
.dafy-chip-icon { width: 18px; height: 18px; object-fit: contain; flex: none; }
.dafy-chip-text { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
::selection { background: color-mix(in srgb, #3B62F6 30%, transparent); }
*::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent); border-radius: 8px; }
*::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent); }

/* ---- 品牌区 ---- */
.dafy-brand-mark {
  display: inline-block; flex: none; background-color: currentColor;
  width: var(--dafy-logo-size, 23px);
  height: calc(var(--dafy-logo-size, 23px) * ${(17.04 / 23.16).toFixed(5)});
  -webkit-mask: ${LOGO_MARK}; mask: ${LOGO_MARK};
}
.dafy-brand-name {
  font-size: var(--dafy-logo-text-size, 16px); font-weight: 600;
  letter-spacing: .01em; color: currentColor; white-space: nowrap;
}
.dafy-brand-badge {
  display: inline-flex; align-items: center; flex: none;
  height: 10px; padding: 0 3px; border-radius: 2px;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-label-primary-inverted);
  font-family: var(--ds-font-family-code, ui-monospace, monospace);
  font-size: 6px; font-weight: 500; line-height: 10px; white-space: nowrap;
}

/* ---- 设置面板 ---- */
.dafy-panel { display: flex; flex-direction: column; gap: 18px; font-size: 13px; color: var(--dsw-alias-label-primary); }
.dafy-group { display: flex; flex-direction: column; gap: 8px; }
.dafy-group-title {
  margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .04em;
  color: var(--dsw-alias-label-secondary);
  border-bottom: 1px solid var(--dsw-alias-border-l1); padding-bottom: 5px;
}
.dafy-row { display: flex; align-items: center; gap: 10px; min-height: 26px; }
.dafy-row-label { flex: 0 0 132px; color: var(--dsw-alias-label-secondary); }
.dafy-row-body { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.dafy-slider { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.dafy-slider input[type="range"] { flex: 1; min-width: 0; accent-color: var(--dsw-alias-brand-primary); }
.dafy-slider-value {
  flex: none; min-width: 52px; text-align: right;
  font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-caption);
}
.dafy-input, .dafy-textarea {
  box-sizing: border-box; width: 100%; min-width: 0;
  padding: 3px 7px; border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary); font: inherit;
}
.dafy-textarea { min-height: 96px; resize: vertical; line-height: 1.6; }
.dafy-input:focus, .dafy-textarea:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
.dafy-color { width: 34px; height: 24px; padding: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; background: none; cursor: pointer; }
.dafy-hex { width: 88px; flex: none; font-family: ui-monospace, monospace; text-transform: uppercase; }
.dafy-select {
  padding: 3px 7px; border-radius: 6px; font: inherit;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary);
}
.dafy-btn {
  padding: 4px 12px; border-radius: 6px; cursor: pointer; font: inherit;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
}
.dafy-btn:hover { border-color: var(--dsw-alias-brand-primary); }
.dafy-hint { color: var(--dsw-alias-label-caption); font-size: 12px; margin: 0; }
`

// ---------------------------------------------------------------------------
// 插槽组件
// ---------------------------------------------------------------------------

/** 品牌标记：主题着色的官方鲸鱼轮廓。 */
function DafyBrandMark(): React.ReactElement | null {
  const cfg = useConfig()
  if (!cfg.brandIconVisible) return null
  return <span className="dafy-brand-mark" aria-hidden="true" />
}

/** 品牌文字 + 可选徽章。 */
function DafyBrandName(): React.ReactElement | null {
  const cfg = useConfig()
  if (!cfg.brandTextVisible && !cfg.brandBadgeVisible) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {cfg.brandTextVisible ? <span className="dafy-brand-name">{cfg.brandText}</span> : null}
      {cfg.brandBadgeVisible ? <span className="dafy-brand-badge">{cfg.brandBadgeText}</span> : null}
    </span>
  )
}

/** 鱼群 + 气泡 + 海面光晕 + 背景水印。 */
function FishSchool(): React.ReactElement | null {
  const cfg = useConfig()
  if (!cfg.schoolEnabled) return null

  const fish = buildFish(cfg)
  const bubbles = bubbleSpecs(cfg)

  return (
    <div className="dafy-school">
      {cfg.washEnabled ? <div className="dafy-wash" /> : null}
      {cfg.watermarkVisible ? (
        <img className="dafy-watermark" src={`/dafy-assets/${cfg.watermarkAsset}`} alt="" />
      ) : null}
      {bubbles.map((bubble, index) => (
        <span
          key={`b${index}`}
          className="dafy-bubble-p"
          style={{
            left: bubble.left,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            animationDuration: `${bubble.dur}s`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}
      {fish.map((spec, index) => (
        <img
          key={`f${index}`}
          className={
            'dafy-fish' + (spec.rev ? ' dafy-fish-rev' : '') + (spec.big ? ' dafy-fish-big' : '')
          }
          src={`/dafy-assets/${spec.src}`}
          alt=""
          style={{
            top: spec.top,
            width: `${spec.size}px`,
            opacity: spec.op,
            animationDuration: `${spec.dur}s`,
            animationDelay: `${spec.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/** 每日鱼语轮播。 */
function FishDock(): React.ReactElement | null {
  const cfg = useConfig()
  const lines = cfg.dockLines
  const [line, setLine] = React.useState(0)

  React.useEffect(() => {
    if (lines.length <= 1) return
    const id = setInterval(() => setLine((i) => (i + 1) % lines.length), cfg.dockIntervalMs)
    return () => clearInterval(id)
  }, [cfg.dockIntervalMs, lines.length])

  if (!cfg.dockEnabled || lines.length === 0) return null
  const text = lines[line % lines.length] ?? ''

  return (
    <div className="dafy-dock">
      <span className="dafy-dock-pill">
        {cfg.dockEmoji ? <span className="dafy-dock-emoji">🐋</span> : null}
        <span key={line} className="dafy-dock-text">
          {text}
        </span>
      </span>
    </div>
  )
}

/** 侧栏底部的鱼群开关。点击直接切换持久配置。 */
function FishChip(props: { wide?: boolean }): React.ReactElement {
  const cfg = useConfig()
  const wide = props.wide !== false
  return (
    <div
      className="dafy-chip"
      title={cfg.schoolEnabled ? cfg.chipTextOn : cfg.chipTextOff}
      onClick={() => setField('schoolEnabled', !cfg.schoolEnabled)}
    >
      <img className="dafy-chip-icon" src="/dafy-assets/whale_icon.png" alt="" />
      {wide ? (
        <span className="dafy-chip-text">{cfg.schoolEnabled ? cfg.chipTextOn : cfg.chipTextOff}</span>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 面板控件
// ---------------------------------------------------------------------------

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <label className="dafy-row">
      <span className="dafy-row-label">{label}</span>
      <span className="dafy-row-body">{children}</span>
    </label>
  )
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (next: boolean) => void
}): React.ReactElement {
  return (
    <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
  )
}

function Slider({
  field,
  value,
  suffix = '',
  format,
  onChange,
}: {
  field: keyof typeof RANGES
  value: number
  suffix?: string
  format?: (value: number) => string
  onChange: (next: number) => void
}): React.ReactElement {
  const range = RANGES[field]
  return (
    <span className="dafy-slider">
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="dafy-slider-value">
        {format !== undefined ? format(value) : value}
        {suffix}
      </span>
    </span>
  )
}

function TextInput({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}): React.ReactElement {
  return (
    <input
      className="dafy-input"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}): React.ReactElement {
  return (
    <>
      <input
        className="dafy-color"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <input
        className="dafy-input dafy-hex"
        type="text"
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
  )
}

function AssetSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (next: T) => void
}): React.ReactElement {
  return (
    <select
      className="dafy-select"
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className="dafy-group">
      <h3 className="dafy-group-title">{title}</h3>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// 设置面板
// ---------------------------------------------------------------------------

const WATERMARK_OPTIONS: readonly WatermarkAsset[] = [
  'whale_side.png',
  'whale_front.png',
  'whale_icon.png',
]
const FISH_OPTIONS: readonly FishAsset[] = ['fish_idle.png', 'fish_happy.png']

function MarineSettingsSection(): React.ReactElement {
  const cfg = useConfig()
  const set = setField

  return (
    <div className="dafy-panel">
      <Group title="品牌区">
        <Row label="显示鲸鱼图标">
          <Toggle value={cfg.brandIconVisible} onChange={(v) => set('brandIconVisible', v)} />
        </Row>
        <Row label="图标大小">
          <Slider field="brandIconSize" value={cfg.brandIconSize} suffix="px" onChange={(v) => set('brandIconSize', v)} />
        </Row>
        <Row label="显示品牌文字">
          <Toggle value={cfg.brandTextVisible} onChange={(v) => set('brandTextVisible', v)} />
        </Row>
        <Row label="品牌文字">
          <TextInput value={cfg.brandText} onChange={(v) => set('brandText', v)} />
        </Row>
        <Row label="文字字号">
          <Slider field="brandTextSize" value={cfg.brandTextSize} suffix="px" onChange={(v) => set('brandTextSize', v)} />
        </Row>
        <Row label="显示徽章">
          <Toggle value={cfg.brandBadgeVisible} onChange={(v) => set('brandBadgeVisible', v)} />
        </Row>
        <Row label="徽章文字">
          <TextInput value={cfg.brandBadgeText} onChange={(v) => set('brandBadgeText', v)} />
        </Row>
      </Group>

      <Group title="配色">
        <Row label="亮色主色">
          <ColorInput value={cfg.primaryLight} onChange={(v) => set('primaryLight', v)} />
        </Row>
        <Row label="暗色主色">
          <ColorInput value={cfg.primaryDark} onChange={(v) => set('primaryDark', v)} />
        </Row>
        <Row label="">
          <button className="dafy-btn" type="button" onClick={resetAll}>
            恢复全部默认
          </button>
        </Row>
        <p className="dafy-hint">改动整套色阶由主色自动派生；错误/成功/警告等状态色保持不变。</p>
      </Group>

      <Group title="背景与氛围">
        <Row label="海面光晕">
          <Toggle value={cfg.washEnabled} onChange={(v) => set('washEnabled', v)} />
        </Row>
        <Row label="光晕强度">
          <Slider field="washStrength" value={cfg.washStrength} suffix="%" onChange={(v) => set('washStrength', v)} />
        </Row>
        <Row label="背景水印">
          <Toggle value={cfg.watermarkVisible} onChange={(v) => set('watermarkVisible', v)} />
        </Row>
        <Row label="水印透明度">
          <Slider
            field="watermarkOpacity"
            value={cfg.watermarkOpacity}
            format={(v) => v.toFixed(2)}
            onChange={(v) => set('watermarkOpacity', v)}
          />
        </Row>
        <Row label="水印素材">
          <AssetSelect
            value={cfg.watermarkAsset}
            options={WATERMARK_OPTIONS}
            onChange={(v) => set('watermarkAsset', v)}
          />
        </Row>
      </Group>

      <Group title="鱼群">
        <Row label="显示鱼群">
          <Toggle value={cfg.schoolEnabled} onChange={(v) => set('schoolEnabled', v)} />
        </Row>
        <Row label="鱼群数量">
          <Slider field="fishCount" value={cfg.fishCount} suffix=" 条" onChange={(v) => set('fishCount', v)} />
        </Row>
        <Row label="游动速度">
          <Slider
            field="fishSpeedScale"
            value={cfg.fishSpeedScale}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set('fishSpeedScale', v)}
          />
        </Row>
        <Row label="鱼群透明度">
          <Slider
            field="fishOpacityScale"
            value={cfg.fishOpacityScale}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set('fishOpacityScale', v)}
          />
        </Row>
        <Row label="鱼的大小">
          <Slider
            field="fishSizeScale"
            value={cfg.fishSizeScale}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set('fishSizeScale', v)}
          />
        </Row>
        <Row label="显示大鲸鱼">
          <Toggle value={cfg.showBigWhale} onChange={(v) => set('showBigWhale', v)} />
        </Row>
        <Row label="小鱼素材 A">
          <AssetSelect value={cfg.fishIdleAsset} options={FISH_OPTIONS} onChange={(v) => set('fishIdleAsset', v)} />
        </Row>
        <Row label="小鱼素材 B">
          <AssetSelect value={cfg.fishHappyAsset} options={FISH_OPTIONS} onChange={(v) => set('fishHappyAsset', v)} />
        </Row>
        <Row label="气泡">
          <Toggle value={cfg.bubbleEnabled} onChange={(v) => set('bubbleEnabled', v)} />
        </Row>
        <Row label="气泡数量">
          <Slider field="bubbleCount" value={cfg.bubbleCount} suffix=" 个" onChange={(v) => set('bubbleCount', v)} />
        </Row>
        <Row label="气泡速度">
          <Slider
            field="bubbleSpeedScale"
            value={cfg.bubbleSpeedScale}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set('bubbleSpeedScale', v)}
          />
        </Row>
      </Group>

      <Group title="每日鱼语">
        <Row label="显示鱼语">
          <Toggle value={cfg.dockEnabled} onChange={(v) => set('dockEnabled', v)} />
        </Row>
        <Row label="切换间隔">
          <Slider
            field="dockIntervalMs"
            value={cfg.dockIntervalMs}
            format={(v) => (v / 1000).toFixed(1)}
            suffix=" 秒"
            onChange={(v) => set('dockIntervalMs', v)}
          />
        </Row>
        <Row label="显示表情">
          <Toggle value={cfg.dockEmoji} onChange={(v) => set('dockEmoji', v)} />
        </Row>
        <Row label="语录列表">
          <textarea
            className="dafy-textarea"
            value={cfg.dockLines.join('\n')}
            spellCheck={false}
            onChange={(event) =>
              set(
                'dockLines',
                event.target.value.split('\n').filter((line) => line.trim().length > 0),
              )
            }
          />
        </Row>
        <p className="dafy-hint">每行一条语录，空行会被忽略。</p>
      </Group>

      <Group title="界面">
        <Row label="收起时文字">
          <TextInput value={cfg.chipTextOn} onChange={(v) => set('chipTextOn', v)} />
        </Row>
        <Row label="召唤时文字">
          <TextInput value={cfg.chipTextOff} onChange={(v) => set('chipTextOff', v)} />
        </Row>
        <Row label="整体缩放">
          <Slider
            field="globalScale"
            value={cfg.globalScale}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set('globalScale', v)}
          />
        </Row>
      </Group>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

export function apply(ctx: ClientContext): void {
  clientCtx = ctx

  // ---- 1. 样式注入 ----
  ctx.effect(() => {
    const id = 'dafy-whale-theme-css'
    let el = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${id}"]`)
    if (el === null) {
      el = document.createElement('style')
      el.dataset.pluginCss = id
      el.dataset.plugin = 'dafy-whale-theme'
      el.textContent = CSS
      document.head.appendChild(el)
    }
    return () => {
      if (el !== null && el.parentNode !== null) el.parentNode.removeChild(el)
    }
  })

  // ---- 2. 绑定配置命名空间并订阅 ----
  const bound = ctx.settingsScope.bind<WhaleConfig>({ namespace: SETTINGS_NAMESPACE })
  scope = bound

  ctx.effect(() => {
    const read = (): void => {
      const snapshot = bound.getSnapshot()
      const value = snapshot.value
      if (value === undefined) return
      const cfg = normalizeConfig(value)
      publish(cfg)
      applyTheme(cfg)
    }
    read()
    return bound.subscribe(read)
  })

  // 先用默认值把主题铺上，避免首帧无样式
  applyTheme(current)

  // ---- 3. 插槽注册 ----
  const { slots } = ctx
  slots.inject('shell.overlay', () =>
    slots.register({ name: 'shell.overlay', id: 'dafy-school', order: 10 }, () => <FishSchool />),
  )
  slots.inject('conversation.input.dock', () =>
    slots.register({ name: 'conversation.input.dock', id: 'dafy-dock', order: 5 }, () => <FishDock />),
  )
  slots.inject('sidebar.footer.action', () =>
    slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'dafy-chip',
        order: 5,
        label: () => `🐟 ${getConfig().schoolEnabled ? getConfig().chipTextOn : getConfig().chipTextOff}`,
      },
      (props: { wide?: boolean }) => <FishChip {...props} />,
    ),
  )
  // 品牌区两个 single 插槽成对注册（写法照官方 brand-official 插件）。
  // 后注册者 priority 更低 = 胜出，故这两条会顶替官方 FishLogo 与版本文案。
  slots.inject('sidebar.brand.mark', () =>
    slots.inject('sidebar.brand.name', function* () {
      yield slots.register({ name: 'sidebar.brand.mark' }, DafyBrandMark)
      yield slots.register({ name: 'sidebar.brand.name' }, DafyBrandName)
    }),
  )

  // ---- 4. 设置面板 ----
  slots.inject('settings.section', () =>
    slots.register(
      {
        name: 'settings.section',
        id: 'dafy-marine',
        order: 20,
        label: () => '海洋主题',
      },
      MarineSettingsSection,
    ),
  )
}
