# unmount 流程

幂等，可重复调用。未 mount 时调用是 no-op。顺序：

1. 停止 3D RAF；
2. 取消 `onShow` / `onHide` 订阅；
3. 对所有能力调用 `dispose()`（单个失败继续下一个）；
4. 调用 `instance.destroy`；
5. 2D 调用 `game.destroy(true)`；
6. 3D 调用 `renderer.dispose()` / `forceContextLoss?.()`；
7. 仅当 canvas 由 runtime 创建时从 DOM 移除；
8. 重置内部状态，允许再次 `mount`。
