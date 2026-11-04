# mount 流程

1. 已 mount 时再次 `mount` 会抛出 `runtime already mounted`。
2. 解析 canvas：
   - 有 `canvas`：直接使用，不拥有所有权；
   - 否则必须有 `mount`，用 `createCanvas` 或 `document.createElement('canvas')` 创建并挂载。
3. 调用 `loadInstance()` 获取游戏实例。
4. 2D：创建 `Phaser.Game`（`config.type` 为 `AUTO` 时按 WebGL 能力选择 `WEBGL` / `CANVAS`），写入 `ctx.game`，调用 `instance.create`，然后对所有能力调用 `bind({ canvas, game })`。
5. 3D：创建 renderer / scene / camera，先对所有能力调用 `bind({ canvas })`，再启动 RAF 循环，最后调用 `instance.create`。
6. 单个能力 `bind` 抛错不会中断 mount。
7. 订阅 `lifecycle.onShow` / `onHide`：隐藏时暂停（2D `game.loop.pause()`，3D 停止 RAF），显示时恢复。

失败时会执行等价于 [unmount](./unmount.md) 的清理、复位状态，调用 `onError`，然后重新抛出。
