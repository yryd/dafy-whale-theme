# dafy-whale-theme（蓝色大肥鱼主题）

DeepSeek Harness web 前端的整站主题插件：海洋蓝配色、游动鱼群、上升气泡、输入框上方「每日鱼语」、左上角品牌替换。

![preview](https://raw.githubusercontent.com/yryd/dafy-whale-theme/main/preview.png)

## 一句话安装

> 帮我去 https://www.npmjs.com/package/dafy-whale-theme 安装大肥鱼插件

把这句话发给你的 DeepSeek Harness，它会自动完成全部安装；完成后按它提示重启 `dsh web` 并刷新浏览器（F5）即可。

## 官方安装（唯一通路）

需要 pnpm。本包在 `package.json` 中声明了 `dsh.bundle`，随包携带自己的组合层 `cordis.patch.yml`，因此官方 CLI 一条命令完成安装并自动挂载：

```bash
dsh plugin --profile web add dafy-whale-theme
```

升级与卸载同样走官方通路：

```bash
dsh plugin --profile web update dafy-whale-theme   # 升级
dsh plugin --profile web remove dafy-whale-theme   # 卸载
```

> patch 层只在**下次启动**时生效：重启 `dsh web` 后刷新页面（web 组合禁用了 HMR，不会热加载）。

## 兼容性

| DSH 版本 | 状态 |
|---|---|
| `0.1.6-alpha.1` | ✅ 当前版本，已实测 |

仅支持 **web** 端（`dsh.client.platform: "web"`）。DSH 处于 alpha 阶段，破坏性变更可能使主题静默失效；升级 DSH 后若品牌区或配色异常，请提 issue。

## 特性

- **可视化设置面板**：设置 → 海洋主题，32 项可调，改动即时生效（见下）
- 海洋蓝亮/暗双主题配色，DeepSeek 蓝品牌色，主色可自定义
- 全屏氛围：海面光晕、上升气泡、来回游动的鱼群（侧边栏可开关）
- 输入框上方滚动「每日鱼语」，语录可自定义
- 左上角品牌：官方鲸鱼图标 + 「蓝色大肥鱼」字标，三段可独立开关
- 窄侧栏自适应，无 UI 裁切

## 设置面板

装好并重启后，进入 **设置 → 海洋主题**，共 6 组 32 项，**改动即时生效**（无需重启、无需点保存）：

| 分组 | 可调项 |
|---|---|
| **品牌区** | 鲸鱼图标开关/大小、品牌文字开关/内容/字号、徽章开关/文字 |
| **配色** | 亮色主色、暗色主色（整套色阶自动派生）、恢复全部默认 |
| **背景与氛围** | 海面光晕开关/强度、背景水印开关/透明度/素材 |
| **鱼群** | 总开关、数量、游动速度、透明度、大小、大鲸鱼开关、小鱼素材、气泡开关/数量/速度 |
| **每日鱼语** | 开关、切换间隔、语录列表（每行一条）、表情开关 |
| **界面** | 侧栏开关文字、整体缩放 |

配色只改主色即可：其余 10 个设计 token 由主色**色相平移**派生，亮/暗两套同步变化；错误/成功/警告等**语义状态色保持不变**。

配置保存在 DSH 用户设置文档的 `dafy-whale` 命名空间下，随 DSH 的设置一起管理。

## 素材与许可

代码采用 MIT 许可（见 [LICENSE](LICENSE)）。图片素材来自社区仓库，均为 MIT 许可、随包分发，逐文件来源见 [NOTICE](NOTICE)。
