# DOM shim Adapter

```ts
interface MinigameAdapter {
  canvas: MinigameCanvas;
  requestFrame: FrameRequest;
  cancelFrame: FrameCancel;
  install(): void;
}

function createMinigameAdapter(api: MinigameAPI): MinigameAdapter;
```

`install()` 幂等，安装 `window` / `document` / `navigator` / `localStorage` / `Image` / `Audio` 等 shim，并在宿主缺失时补 `requestAnimationFrame` / `cancelAnimationFrame` / `performance`。

约束：

- adapter 构造期不引用全局 `document` / `window`；
- `Image` / `Audio` 由 `MinigameAPI.createImage` 或全局 `createImage` 派生；
- 帧调度在 `install()` 前捕获宿主 rAF，避免被 shim 后自递归；
- 小游戏引导代码必须使用 adapter 暴露的 `requestFrame` / `cancelFrame`。
