# AR Saturn Gesture Lab

一个 Web AR 实验，用摄像头画面作为背景，通过手势控制 Three.js 土星模型。

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

## 交互

- 点击 `开启 AR` 开启或关闭摄像头和手势追踪。
- 点击 `重置` 恢复默认视角。
- 单手移动控制土星旋转。
- 拇指和食指捏合控制缩放。
- 双手同时出现时，双手距离控制缩放，高度差控制土星倾角。
- 摄像头不可用时，可以用鼠标或触控拖拽旋转，用滚轮缩放。

手势识别使用 MediaPipe Tasks Vision，3D 渲染使用 Three.js。
