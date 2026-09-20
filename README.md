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

## 特性

- 海洋蓝亮/暗双主题配色，DeepSeek 蓝品牌色
- 全屏氛围：海面光晕、上升气泡、来回游动的鱼群（侧边栏可开关）
- 输入框上方滚动「每日鱼语」
- 左上角品牌：官方鲸鱼图标 + 「蓝色大肥鱼」字标
- 窄侧栏自适应，无 UI 裁切

## 素材与许可

代码采用 MIT 许可（见 [LICENSE](LICENSE)）。图片素材来自社区仓库，均为 MIT 许可、随包分发，逐文件来源见 [NOTICE](NOTICE)。
