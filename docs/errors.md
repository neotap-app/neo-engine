# 错误边界

- `runtime.mount` 失败时会执行等价于 [unmount](./runtime/unmount.md) 的清理、复位状态，调用 `onError`，然后重新抛出。
- 生成的引导代码会统一上报 mount 错误：`console.error`、派发 `neo:error` 事件、向挂载点写入可见兜底文案，并监听 `error` / `unhandledrejection`。
- 能力的 `bind` / `dispose` 异常不会中断 runtime 的其他清理步骤。
- `ILifecycle` 的订阅在 `unmount` 时自动取消。
- 无 `window` 的小游戏环境只保证不抛错，不强求视觉兜底。
