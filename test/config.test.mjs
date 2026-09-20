/**
 * 配置模型的纯函数测试（node:test，零测试框架依赖）。
 *
 * 最关键的一条：**默认配置必须精确还原改造前的视觉**。
 * 这条如果失守，「初版 = 当前主题 1:1 复现」就无从谈起。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE_FISH,
  BASE_TOKENS,
  DEFAULTS,
  DEFAULT_DOCK_LINES,
  RANGES,
  bubbleSpecs,
  buildFish,
  deriveTokens,
  hexToHsl,
  hslToHex,
  isHexColor,
  normalizeConfig,
  shiftHue,
  toCssVars,
} from '../lib/config.js'

test('DEFAULTS 逐字段等于改造前的现状', () => {
  assert.equal(DEFAULTS.brandIconVisible, true)
  assert.equal(DEFAULTS.brandIconSize, 23)
  assert.equal(DEFAULTS.brandText, '蓝色大肥鱼')
  assert.equal(DEFAULTS.brandTextSize, 16)
  assert.equal(DEFAULTS.brandBadgeVisible, false)
  assert.equal(DEFAULTS.primaryLight, '#3B62F6')
  assert.equal(DEFAULTS.primaryDark, '#6C8CFF')
  assert.equal(DEFAULTS.watermarkOpacity, 0.1)
  assert.equal(DEFAULTS.watermarkAsset, 'whale_side.png')
  assert.equal(DEFAULTS.fishCount, 5)
  assert.equal(DEFAULTS.showBigWhale, true)
  assert.equal(DEFAULTS.bubbleCount, 14)
  assert.equal(DEFAULTS.dockIntervalMs, 9000)
  assert.equal(DEFAULTS.globalScale, 1)
  assert.deepEqual(DEFAULTS.dockLines, [...DEFAULT_DOCK_LINES])
  assert.equal(DEFAULTS.dockLines.length, 7)
})

test('normalizeConfig: 缺省输入回落到默认值', () => {
  assert.deepEqual(normalizeConfig(undefined), DEFAULTS)
  assert.deepEqual(normalizeConfig(null), DEFAULTS)
  assert.deepEqual(normalizeConfig({}), DEFAULTS)
  assert.deepEqual(normalizeConfig('nonsense'), DEFAULTS)
})

test('normalizeConfig: 数值越界被 clamp 到合法区间', () => {
  const low = normalizeConfig({ fishCount: -99, brandIconSize: 1, globalScale: 0 })
  assert.equal(low.fishCount, RANGES.fishCount.min)
  assert.equal(low.brandIconSize, RANGES.brandIconSize.min)
  assert.equal(low.globalScale, RANGES.globalScale.min)

  const high = normalizeConfig({ fishCount: 999, brandIconSize: 999, globalScale: 99 })
  assert.equal(high.fishCount, RANGES.fishCount.max)
  assert.equal(high.brandIconSize, RANGES.brandIconSize.max)
  assert.equal(high.globalScale, RANGES.globalScale.max)
})

test('normalizeConfig: 非法类型与非法颜色回落默认', () => {
  const cfg = normalizeConfig({
    fishCount: 'many',
    primaryLight: 'red',
    primaryDark: '#GGGGGG',
    brandText: 42,
    watermarkAsset: 'evil.png',
    fishIdleAsset: 'whale_front.png',
  })
  assert.equal(cfg.fishCount, DEFAULTS.fishCount)
  assert.equal(cfg.primaryLight, DEFAULTS.primaryLight)
  assert.equal(cfg.primaryDark, DEFAULTS.primaryDark)
  assert.equal(cfg.brandText, DEFAULTS.brandText)
  assert.equal(cfg.watermarkAsset, DEFAULTS.watermarkAsset)
  // fishIdleAsset 只接受 fish_*，鲸鱼素材应被拒绝
  assert.equal(cfg.fishIdleAsset, DEFAULTS.fishIdleAsset)
})

test('normalizeConfig: 语录列表保留空行，非数组才回落默认', () => {
  // 保留空行是刻意的：过滤放到渲染时做，否则面板 textarea 会吞掉用户按下的回车
  assert.deepEqual(normalizeConfig({ dockLines: ['a', '', '  ', 'b'] }).dockLines, ['a', '', '  ', 'b'])
  assert.deepEqual(normalizeConfig({ dockLines: [] }).dockLines, [], '空数组 = 用户主动清空')
  assert.deepEqual(normalizeConfig({ dockLines: 'nope' }).dockLines, [...DEFAULT_DOCK_LINES])
  assert.deepEqual(normalizeConfig({ dockLines: ['a', 42, null] }).dockLines, ['a'], '只保留字符串项')
})

test('normalizeConfig 是幂等的', () => {
  const once = normalizeConfig({ fishCount: 99, brandText: 'x' })
  assert.deepEqual(normalizeConfig(once), once)
})

test('deriveTokens: 默认主色精确还原基准 token（1:1 复现的关键）', () => {
  const tokens = deriveTokens(DEFAULTS.primaryLight, DEFAULTS.primaryDark)
  for (const [name, modes] of Object.entries(BASE_TOKENS)) {
    assert.equal(tokens[name].light, modes.light, `${name} light 应精确还原`)
    assert.equal(tokens[name].dark, modes.dark, `${name} dark 应精确还原`)
  }
  assert.equal(Object.keys(tokens).length, Object.keys(BASE_TOKENS).length)
})

test('deriveTokens: 状态色不随主色变化', () => {
  const tokens = deriveTokens('#FF0000', '#00FF00')
  for (const name of [
    '--dsw-alias-state-error-primary',
    '--dsw-alias-state-success-primary',
    '--dsw-alias-state-warn-primary',
  ]) {
    assert.deepEqual(tokens[name], BASE_TOKENS[name], `${name} 不应随主色漂移`)
  }
})

test('deriveTokens: 换主色时其它 token 跟随（色相平移）', () => {
  const tokens = deriveTokens('#FF0000', '#FF0000')
  assert.equal(tokens['--dsw-alias-brand-primary'].light, '#FF0000')
  // 背景类 token 应发生位移，但仍保持可解析的 hex
  assert.notEqual(tokens['--dsw-alias-bg-base'].light, BASE_TOKENS['--dsw-alias-bg-base'].light)
  assert.ok(isHexColor(tokens['--dsw-alias-bg-base'].light))
  assert.ok(isHexColor(tokens['--dsw-alias-label-primary'].dark))
})

test('hexToHsl / hslToHex 往返稳定', () => {
  for (const hex of ['#3B62F6', '#FFFFFF', '#000000', '#E9F3FC', '#0A1428']) {
    const { h, s, l } = hexToHsl(hex)
    assert.equal(hslToHex(h, s, l), hex.toUpperCase())
  }
})

test('shiftHue: 位移 0 时保持原值（避免往返取整误差）', () => {
  for (const hex of ['#3B62F6', '#E9F3FC', '#0A1428', '#C6DCF2']) {
    assert.equal(shiftHue(hex, 0), hex.toUpperCase())
  }
})

test('buildFish: 默认配置产出与改造前逐字段一致的 5 条', () => {
  const fish = buildFish(DEFAULTS)
  assert.equal(fish.length, 5)
  fish.forEach((spec, index) => {
    const base = BASE_FISH[index]
    assert.equal(spec.top, base.top)
    assert.equal(spec.size, base.size)
    assert.equal(spec.dur, base.dur)
    assert.equal(spec.delay, base.delay)
    assert.equal(spec.op, base.op)
    assert.equal(spec.big, base.big)
  })
  assert.equal(fish[0].src, 'fish_idle.png')
  assert.equal(fish[1].src, 'fish_happy.png')
  assert.equal(fish[4].src, 'whale_front.png')
})

test('buildFish: 数量与倍率生效', () => {
  assert.equal(buildFish(normalizeConfig({ fishCount: 0 })).length, 0)
  assert.equal(buildFish(normalizeConfig({ fishCount: 3 })).length, 3)
  assert.equal(buildFish(normalizeConfig({ fishCount: 12 })).length, 12)

  const faster = buildFish(normalizeConfig({ fishSpeedScale: 2 }))
  assert.equal(faster[0].dur, BASE_FISH[0].dur / 2)

  const smaller = buildFish(normalizeConfig({ fishSizeScale: 0.5 }))
  assert.equal(smaller[0].size, BASE_FISH[0].size * 0.5)
})

test('buildFish: 关闭大鲸鱼后不出现 big 条目', () => {
  const fish = buildFish(normalizeConfig({ showBigWhale: false, fishCount: 12 }))
  assert.ok(fish.every((spec) => !spec.big))
})

test('buildFish: 透明度倍率生效且不超过 1', () => {
  const dimmer = buildFish(normalizeConfig({ fishOpacityScale: 0.5 }))
  assert.equal(dimmer[0].op, BASE_FISH[0].op * 0.5)
  const saturated = buildFish(normalizeConfig({ fishOpacityScale: 2 }))
  assert.ok(saturated.every((spec) => spec.op <= 1), '透明度不应超过 1')
  const invisible = buildFish(normalizeConfig({ fishOpacityScale: 0 }))
  assert.ok(invisible.every((spec) => spec.op === 0))
})

test('buildFish: 自定义小鱼素材被采用，大鲸鱼始终用 whale_front', () => {
  const swapped = buildFish(
    normalizeConfig({ fishIdleAsset: 'fish_happy.png', fishHappyAsset: 'fish_idle.png' }),
  )
  assert.equal(swapped[0].src, 'fish_happy.png', '下标 0 用 idle 槽位的素材')
  assert.equal(swapped[1].src, 'fish_idle.png', '下标 1 用 happy 槽位的素材')
  assert.equal(swapped[4].src, 'whale_front.png', '大鲸鱼不受小鱼素材影响')
})

test('bubbleSpecs: 默认 14 个且沿用改造前公式', () => {
  const bubbles = bubbleSpecs(DEFAULTS)
  assert.equal(bubbles.length, 14)
  assert.equal(bubbles[0].left, '0%')
  assert.equal(bubbles[0].size, 5)
  assert.equal(bubbles[0].dur, 12)
  assert.equal(bubbles[0].delay, -0)
  // 第 4 个（i=3）：left 21.93%, size 5+((39)%13)=5+0=5 → 校验公式
  assert.equal(bubbles[3].left, `${(3 * 7.31) % 100}%`)
  assert.equal(bubbles[3].size, 5 + ((3 * 13) % 13))
})

test('bubbleSpecs: 关闭或数量为 0 时为空', () => {
  assert.equal(bubbleSpecs(normalizeConfig({ bubbleEnabled: false })).length, 0)
  assert.equal(bubbleSpecs(normalizeConfig({ bubbleCount: 0 })).length, 0)
  assert.equal(bubbleSpecs(normalizeConfig({ bubbleCount: 30 })).length, 30)
})

test('bubbleSpecs: 速度倍率影响时长', () => {
  const slow = bubbleSpecs(normalizeConfig({ bubbleSpeedScale: 0.5 }))
  assert.equal(slow[0].dur, 12 / 0.5)
})

test('toCssVars 输出全部预期变量', () => {
  const vars = toCssVars(DEFAULTS)
  assert.equal(vars['--dafy-scale'], '1')
  assert.equal(vars['--dafy-logo-size'], '23px')
  assert.equal(vars['--dafy-logo-text-size'], '16px')
  assert.equal(vars['--dafy-watermark-opacity'], '0.1')
  assert.equal(vars['--dafy-wash-strength'], '1')
})

test('globalScale 是「整体缩放」：logo / 文字 / 鱼 / 气泡 / 水印全都跟随', () => {
  const base = normalizeConfig({})
  const big = normalizeConfig({ globalScale: 1.5 })

  const baseVars = toCssVars(base)
  const bigVars = toCssVars(big)

  // 水印：由 --dafy-scale 驱动
  assert.notEqual(baseVars['--dafy-scale'], bigVars['--dafy-scale'])
  // 品牌标记与文字：必须直接被缩放（曾经漏掉，只影响水印）
  assert.equal(baseVars['--dafy-logo-size'], '23px')
  assert.equal(bigVars['--dafy-logo-size'], '34.5px')
  assert.equal(baseVars['--dafy-logo-text-size'], '16px')
  assert.equal(bigVars['--dafy-logo-text-size'], '24px')
  // 鱼与气泡
  assert.equal(buildFish(base)[0].size, 56)
  assert.equal(buildFish(big)[0].size, 84)
  assert.equal(bubbleSpecs(base)[0].size, 5)
  assert.equal(bubbleSpecs(big)[0].size, 7.5)
})

test('globalScale = 1 时尺寸精确等于改造前（不引入浮点毛刺）', () => {
  const cfg = normalizeConfig({})
  assert.equal(toCssVars(cfg)['--dafy-logo-size'], '23px')
  assert.equal(toCssVars(cfg)['--dafy-logo-text-size'], '16px')
  // 56 而不是 56.00000000000001
  assert.equal(buildFish(cfg)[0].size, 56)
  assert.equal(buildFish(cfg)[4].size, 170)
  assert.equal(bubbleSpecs(cfg)[0].size, 5)
})

test('globalScale 与单鱼倍率叠加而非互相覆盖', () => {
  const cfg = normalizeConfig({ globalScale: 1.5, fishSizeScale: 0.5 })
  // 56 * 0.5 * 1.5 = 42（两个倍率相乘）
  assert.equal(buildFish(cfg)[0].size, 42)
  // 越界的 globalScale 先被 clamp 到上限 1.5
  assert.equal(normalizeConfig({ globalScale: 9 }).globalScale, RANGES.globalScale.max)
})
