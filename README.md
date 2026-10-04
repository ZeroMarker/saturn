# AR Saturn Gesture Lab

一个 Web AR 实验，用摄像头画面作为背景，通过手势控制 Three.js 土星模型。

**线上地址：**

```
https://zeromarker.github.io/saturn/
```

---

## 本地开发

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。摄像头权限需要安全上下文（`localhost` / `127.0.0.1` 可用；线上部署需要 HTTPS）。

## 构建

```bash
npm run lint     # ESLint 代码检查
npm test         # 摄像头、手势、触控和环纹理回归测试
npm run build    # Vite 生产构建，产物输出到 dist/
npm run preview  # 本地预览构建产物
```

## 项目结构

```text
.
├── .github/workflows/deploy.yml  # GitHub Pages 部署工作流
├── index.html                    # 页面入口
├── public/.nojekyll              # GitHub Pages 静态发布标记
├── src/
│   ├── main.js                   # 入口，组装各模块
│   ├── state.js                  # 共享状态、常量、工具函数
│   ├── scene.js                  # Three.js 场景、渲染循环、预设切换
│   ├── camera.js                 # 摄像头流生命周期、帧检测循环
│   ├── gestures.js               # MediaPipe 手势识别、检测、绘制
│   ├── ui.js                     # DOM 引用、HUD、指针备用、按钮绑定
│   ├── pointer.js                # 单指旋转、双指捏合、滚轮控制
│   ├── video-layout.js           # 摄像头裁剪与镜像坐标映射
│   └── procedural.js             # 土星纹理、环阴影和星场生成
├── styles.css                    # 全局布局和 HUD 样式
├── eslint.config.js              # ESLint 最小化配置 (browser globals)
└── vite.config.js                # Vite base 路径配置（自动适配 GitHub Pages）
```

## 交互方式

| 输入 | 操作 | 效果 |
|------|------|------|
| 🖐️ 单手（手掌） | 移动手掌位置 | 旋转土星 |
| 🤏 单手（捏合） | 捏合后张开 / 收拢拇指与食指；充分张开后释放 | 相对当前尺寸放大 / 缩小 |
| 👐 双手 | 双手距离 / 高度差 | 缩放 + 倾斜倾角 |
| 🖱️ 鼠标/触控 | 拖拽 | 旋转（摄像头不可用时备用） |
| 📱 双指触控 | 捏合 / 张开 | 缩放（摄像头不可用时备用） |
| 🖱️ 滚轮 | 滚动 | 缩放（摄像头不可用时备用） |
| 🔘 预设按钮 | 自然 / 红外 / 食影 | 切换显示风格 |
| 🔘 重置 | 点击 | 恢复默认视角 |

手势识别使用 **MediaPipe Tasks Vision**，3D 渲染使用 **Three.js**。

## 模块 API

每个模块通过 `main.js` 以回调函数方式组装，模块间不直接引用。以下是各模块的公开接口：

### `state.js`

```js
import { state, DEFAULT_VIEW, LIMITS, setGestureTarget, midpoint, distance } from "./state.js";
```

- **`state`** — 共享状态对象：`targetRotationY/X`, `targetScale`, `targetTilt`, `detected`, `mirroredCamera`, `mode`, `preset`
- **`DEFAULT_VIEW`** — 默认视角常量（rotationY: 0.45, rotationX: -0.12, scale: 1, tilt: 26.7°）
- **`LIMITS`** — 各轴边界
- **`setGestureTarget(key, value, smoothing)`** — 带平滑和限幅的目标值设置
- **`midpoint(a, b)`** / **`distance(a, b)`** — 手势关节工具函数

### `scene.js`

```js
import { initScene, resize, setPreset, startAnimation, stopAnimation } from "./scene.js";
```

- **`initScene(canvas)`** — 创建 WebGLRenderer、场景、相机、灯光、土星网格、星场；返回 `{ renderer, scene, camera, root, saturn, rings, keyLight, stars }`
- **`resize()`** — 响应窗口大小变化
- **`setPreset(preset)`** — 切换显示预设（natural / infrared / eclipse）
- **`startAnimation()`** — 启动 requestAnimationFrame 循环（含 delta-time）
- **`stopAnimation()`** — 停止渲染循环

### `camera.js`

```js
import {
  configureCamera, isCameraOn, startCamera, stopCamera,
  setHandDetectFunction, handleVisibilityChange,
} from "./camera.js";
```

- **`configureCamera(config)`** — 注入视频元素和各回调函数：`video`, `updateTrackingLabel`, `setCameraButtonState`, `updateMode`, `updateHud`, `onStreamReady`, `onStreamEnd`
- **`isCameraOn()`** — 摄像头是否已启动
- **`startCamera()`** — 请求摄像头权限 → 开启流 → 触发 `onStreamReady` → 启动检测循环
- **`stopCamera()`** — 停止检测循环、释放流、清理 UI 状态
- **`setHandDetectFunction(fn)`** — 注入帧检测回调 `(videoElement, time) => void`
- **`handleVisibilityChange()`** — 页面可见性变化处理（暂停/恢复检测）

### `gestures.js`

```js
import {
  configureGestures, initHandTracking, detectHands,
  applyGestureResult, closeHandLandmarker, clearGestureCanvas,
  getHandLandmarker, loadHandLandmarker,
} from "./gestures.js";
```

- **`configureGestures(config)`** — 注入 `video`、`gestureContext`、`updateHud` 和 `updateTrackingLabel` 回调
- **`initHandTracking()`** — 动态加载 MediaPipe 运行时 → 创建 HandLandmarker（GPU → CPU 降级）
- **`detectHands(videoElement, time)`** — 执行单帧检测，返回 `landmarks[]`
- **`applyGestureResult(hands)`** — 解析手势结果：更新状态、绘制骨骼、调用 `updateHud`
- **`closeHandLandmarker()`** — 释放 MediaPipe 模型资源
- **`clearGestureCanvas()`** — 清除手势叠加层
- **`getHandLandmarker()`** — 获取内部 HandLandmarker 实例引用
- **`loadHandLandmarker(vision, filesetResolver)`** — 底层模型加载器（可供高级用例直接调用）

### `ui.js`

```js
import {
  video, sceneCanvas, gestureContext, gestureCanvas,
  configureUI, updateHud, setCameraButtonState, updateMode, updateTrackingLabel,
  resizeGestureCanvas, bindPointerFallback, bindPresetButtons,
  bindCameraButton, bindResetButton, setIsCameraOn,
} from "./ui.js";
```

- DOM 导出：`video`, `sceneCanvas`, `gestureCanvas`, `gestureContext`, `trackingLabel` 等
- **`configureUI(config)`** — 注入 `setPreset` 和 `startCamera` 回调
- **`updateHud()`** — 刷新 HUD 显示（模式/缩放/倾角/追踪状态）
- **`setCameraButtonState(state)`** — 更新 AR 按钮文字和 `aria-pressed` 状态
- **`updateMode(mode)`** — 设置 `state.mode`（供摄像头模块内部使用）
- **`updateTrackingLabel(text)`** — 更新追踪状态提示文字
- **`resizeGestureCanvas()`** — 按窗口和 DPR 调整手势画布尺寸
- **`setIsCameraOn(fn)`** — 注入 `isCameraOn` 判断函数（供重置按钮使用）
- **`getPointer()`** — 获取指针状态对象（`{ active, x, y, lastX, lastY }`）
- **`bindPointerFallback()`** — 绑定鼠标/触控拖拽和滚轮事件
- **`bindPresetButtons()`** / **`bindCameraButton()`** / **`bindResetButton()`** — 按钮事件绑定

## 实现说明

- Three.js 通过 npm 管理并由 Vite 打包。
- MediaPipe Tasks Vision 仍通过运行时 CDN 加载，因为手势模型和 wasm 需要浏览器侧按需初始化。
- 摄像头关闭时会释放 stream；页面隐藏时暂停手势检测，回到前台后恢复。
- 页面隐藏时同时暂停 3D 渲染；离开页面时关闭摄像头，浏览器后退恢复页面后可重新开启 AR。
- 摄像头启动采用会话标记，停止或断开后不会被迟到的权限请求或模型加载结果重新激活；迟到的资源会被释放。
- 摄像头启动取消后，旧请求即使返回参数不支持，也不会继续请求备用约束。
- 权限拒绝、设备占用等错误直接提示，仅在参数不支持时尝试备用约束；识别异常会关闭摄像头并提供重试。
- 手势画布的像素比上限为 2，降低高分屏的绘制开销；窄屏和低高度窗口分别使用避免重叠的控制布局。
- 竖屏按宽高比调整相机距离，默认视角可以完整展示土星环。
- 手势骨架与手掌控制坐标均按视频 `object-fit: cover` 的居中裁剪与镜像转换定位；双手操控使用双掌中心旋转，并按屏幕左右顺序计算倾角，避免检测顺序变化引发跳动。
- 单手捏合记录起始指距和当前缩放，按相对指距变化缩放；激活与释放使用不同阈值，允许张开超过激活阈值后继续缩放。手势丢失、切换双手或关闭摄像头会清除捏合基准。
- 触控支持单指旋转和双指捏合缩放，取消操作或窗口失焦会释放指针；滚轮仅在模型画布上缩放，并统一像素、行、页单位。
- 土星环纹理沿半径映射为同心条带，使用纹理自身的透明度，并关闭半透明环的深度写入。
- 土星纹理、环纹理、环阴影和多层星场由 `src/procedural.js` 生成，使用固定种子保证刷新后一致。
- 渲染循环使用 **delta-time** 归一化到 60fps，确保不同帧率下旋转速度一致。
- **ESLint** 检查应用与测试代码，告警也会阻止检查通过；**Node.js Test Runner** 覆盖摄像头、手势与触控交互回归。
- 开发进度追踪见 [`todo.md`](./todo.md)。

## GitHub Pages 部署

工作流文件：`.github/workflows/deploy.yml`

1. push 到 `main` 时自动运行，也可在 Actions 页面手动触发。
2. 执行 `npm ci` → `npm run lint` → `npm run build` → `npm test`，然后将 `dist/` 发布到 GitHub Pages。
3. 首次使用时，在仓库 Settings → Pages → **Source** 中选择 **GitHub Actions**。

项目站点会自动使用仓库名作为 Vite `base`（例如 `https://zeromarker.github.io/saturn/`）。

> 如果 Deploy 阶段出现 `Deployment failed, try again later.`，通常不是构建产物问题。先在 Actions 页面重跑失败 job；如果仍失败，重跑整个 workflow。
