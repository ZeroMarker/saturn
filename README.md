# AR Saturn Gesture Lab

一个纯静态 Web app，用摄像头画面作为 AR 背景，通过手势控制 Three.js 土星模型。

## 运行

```bash
python3 -m http.server 4173
```

打开：

```text
http://127.0.0.1:4173/
```

## 交互

- 点击 `Camera` 开启摄像头和手势追踪。
- 单手移动控制土星旋转。
- 拇指和食指捏合控制缩放。
- 双手同时出现时，双手距离控制缩放，高度差控制土星倾角。
- 摄像头不可用时，可以用鼠标或触控拖拽旋转，用滚轮缩放。

手势识别使用 MediaPipe Tasks Vision，3D 渲染使用 Three.js。
