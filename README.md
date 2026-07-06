# AR Saturn Gesture Lab

一个 Web AR 实验，用摄像头画面作为背景，通过手势控制 Three.js 土星模型。

线上地址：

```text
https://zeromarker.github.io/saturn/
```

## 本地开发

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

摄像头权限需要安全上下文。本地 `localhost` / `127.0.0.1` 可用；线上部署需要 HTTPS。

## 构建

```bash
npm run lint
npm run build
npm run preview
```

构建产物会输出到 `dist/`。

## 项目结构

```text
.
├── .github/workflows/deploy.yml  # GitHub Pages 部署工作流
├── index.html                    # 页面入口
├── public/.nojekyll              # GitHub Pages 静态发布标记
├── src/main.js                   # 应用入口、渲染循环、摄像头和手势交互
├── src/procedural.js             # 土星纹理、环阴影和星场生成
├── styles.css                    # 全局布局和 HUD 样式
└── vite.config.js                # Vite base 路径配置
```

## GitHub Pages 部署

仓库已包含 GitHub Actions 工作流：

```text
.github/workflows/deploy.yml
```

部署流程：

- push 到 `main` 时自动运行。
- 也可以在 GitHub Actions 页面手动运行 `Deploy GitHub Pages`。
- 工作流会执行 `npm ci`、`npm run lint`、`npm run build`，然后把 `dist/` 发布到 GitHub Pages。

首次使用时，在 GitHub 仓库设置中打开：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

项目站点会自动使用仓库名作为 Vite `base`，例如 `https://zeromarker.github.io/saturn/`。

如果 Deploy 阶段出现 GitHub Pages 后端临时错误：

```text
Deployment failed, try again later.
```

通常不是构建产物问题。先在 Actions 页面重跑失败 job；如果仍失败，重跑整个 workflow。

## 交互

- 点击 `开启 AR` 开启或关闭摄像头和手势追踪。
- 点击 `重置` 恢复默认视角。
- 单手移动控制土星旋转。
- 拇指和食指捏合控制缩放。
- 双手同时出现时，双手距离控制缩放，高度差控制土星倾角。
- 摄像头不可用时，可以用鼠标或触控拖拽旋转，用滚轮缩放。

手势识别使用 MediaPipe Tasks Vision，3D 渲染使用 Three.js。

## 实现说明

- Three.js 通过 npm 管理并由 Vite 打包。
- MediaPipe Tasks Vision 仍通过运行时 CDN 加载，因为手势模型和 wasm 需要浏览器侧按需初始化。
- 摄像头关闭时会释放 stream，页面隐藏时会暂停手势检测，回到前台后恢复。
- 土星纹理、环纹理、局部环阴影和多层星场由 `src/procedural.js` 生成，并使用固定种子保证刷新后一致。
