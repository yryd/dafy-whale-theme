# dafy-whale-theme（蓝色大肥鱼主题）

DeepSeek Harness web 前端的整站主题插件：海洋蓝配色、游动鱼群、上升气泡、右下角 DeepSeek 娘吉祥物（可互动）、输入框上方「每日鱼语」、左上角品牌替换。

![preview](preview.png)

## 一句话安装

> 帮我去 https://github.com/DViridescent/dafy-whale-theme 安装大肥鱼插件

把这句话发给你的 DeepSeek Harness，它会自动完成全部安装；完成后按它提示重启 `dsh web` 并刷新浏览器（F5）即可。

## 官方安装（推荐）

本包在 `package.json` 中声明了 `dsh.bundle`，随包携带自己的组合层 `cordis.patch.yml`，因此官方 `dsh plugin` 一条命令完成安装并自动挂载（需要 pnpm）：

```bash
dsh plugin --profile web add github:DViridescent/dafy-whale-theme
```

升级与卸载同样走官方通路：

```bash
dsh plugin --profile web update dafy-whale-theme   # 升级
dsh plugin --profile web remove dafy-whale-theme   # 卸载
```

> 安装/卸载只改组合层，patch 在**下次启动**时生效：重启 `dsh web` 后刷新页面（web 组合禁用了 HMR，不会热加载）。

## 安装脚本（无 dsh CLI 时）

克隆本仓库到任意位置，然后执行：

```bash
node install.mjs
```

脚本优先调用官方通路（`dsh plugin add`）；`dsh` CLI 或 pnpm 不可用时自动回退为手动挂载：按 `package.json` 的 `files` 白名单复制插件、向 `cordis.patch.yml` 写入挂载行（正确处理模板自带的 `[]` 占位）、补齐全部素材并自检。幂等：两条通路互斥，重复执行不会重复挂载。

## 手动挂载

在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中追加（若文件还是模板默认的 `[]` 占位，请先删掉 `[]` 再追加）：

```yaml
- insert:
    - id: dafy-whale-theme
      name: dafy-whale-theme
```

并把本包放进该 profile 的依赖（`dsh plugin --profile web add …`）或 `profiles/web/node_modules/dafy-whale-theme`。与官方通路二选一，不要同时保留依赖挂载和手动挂载行。

## 特性

- 海洋蓝亮/暗双主题配色，DeepSeek 蓝品牌色
- 全屏氛围：海面光晕、上升气泡、来回游动的鱼群（侧边栏可开关）
- 右下角 DeepSeek 娘吉祥物：单击招手+随机肥鱼语录，双击弹出梗图，悬停 ✕ 收起
- 输入框上方滚动「每日鱼语」
- 左上角品牌：官方鲸鱼图标 + 「蓝色大肥鱼」字标
- 窄侧栏自适应，无 UI 裁切

## 素材与许可

代码采用 MIT 许可（见 [LICENSE](LICENSE)）。图片素材来自社区仓库，逐文件许可明细见 [NOTICE](NOTICE)：

- MIT 许可素材（鲸鱼娘立绘、肥鱼表情、梗图）随仓库分发
- DeepSeek 娘动图（源仓库无许可声明）由安装脚本在**安装时自动从原仓库获取**，本仓库不直接分发

「DeepSeek 娘」为基于 DeepSeek 品牌角色的二创形象，如计划大规模商业使用请自行评估品牌权利风险。
