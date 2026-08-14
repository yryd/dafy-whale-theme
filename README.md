# dafy-whale-theme（蓝色大肥鱼主题）

DeepSeek Harness web 前端的整站主题插件：海洋蓝配色、游动鱼群、上升气泡、右下角 DeepSeek 娘吉祥物（可互动）、输入框上方“每日鱼语”、左上角品牌替换。

## 🐋 一句话安装（给你的 DSH）

> 帮我去 https://github.com/DViridescent/dafy-whale-theme 安装大肥鱼插件

DSH agent 会执行本仓库的自动化安装脚本；如需“完全体”吉祥物动图，把上面那句改成：

> 帮我去 https://github.com/DViridescent/dafy-whale-theme 安装大肥鱼插件，并带上扩展素材

**Agent 安装步骤（确定性流程，脚本已自动化）：**

1. `git clone --depth 1 <仓库地址>` 到临时目录
2. `node install.mjs`（默认装入 `$DSH_HOME/profiles/web`；可用 `--profile` 覆盖；`--fetch-extra` 额外从源仓库下载三张 DeepSeek 娘 GIF）
3. 脚本自动：复制插件 → 幂等写入 `cordis.patch.yml` 挂载行 → 校验
4. 提示用户刷新浏览器（F5）即可

## 手动安装

1. 复制本目录到 `$DSH_HOME/profiles/web/node_modules/dafy-whale-theme/`
2. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 追加：

   ```yaml
   - insert:
       - id: dafy-whale-theme
         name: dafy-whale-theme
   ```

3. 刷新浏览器页面（patch 监视器会热应用宿主路由）。

或经 npm / tarball：

```bash
dsh plugin --profile web add dafy-whale-theme
dsh plugin --profile web add ./dafy-whale-theme-1.0.0.tgz
```

（同样需要上面的两行 patch。）

## 结构与行为

- `index.mjs`：宿主半部，注册 `/dafy-assets` 素材静态路由
- `client.js`：浏览器 bundle（`dsh.client` 声明，自动进入 web 插件图）
- `install.mjs`：一键安装（幂等，`--fetch-extra` 按需拉取扩展素材）
- 吉祥物：单击招手+随机肥鱼语录，双击弹梗图，悬停 ✕ 收起；缺图时自动回退 🐋 emoji
- 品牌替换使用结构选择器，不依赖打包哈希；产品结构变化时安静回退

## 素材与许可（重要）

代码 MIT（见 [LICENSE](LICENSE)）。图片素材许可见 [NOTICE](NOTICE)：

- MIT 素材（鲸鱼娘、肥鱼、梗图）：随仓库分发 ✅
- 无许可证素材（DeepSeek 娘 GIF ×3）：**不随仓库分发**，由用户自行执行 `node install.mjs --fetch-extra` 从原仓库下载
- “DeepSeek 娘”属品牌角色二创，公开发布前请自行评估商标/角色形象风险

## 发布到 GitHub

```bash
cd 本目录
git init
git add -A
git commit -m "dafy-whale-theme: 蓝色大肥鱼主题插件"
git branch -M main
git remote add origin https://github.com/DViridescent/dafy-whale-theme.git
git push -u origin main
```
