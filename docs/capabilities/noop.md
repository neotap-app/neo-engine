# no-op 降级

无实现的能力返回 `available: false`，调用方代码无需分支。

| 工厂 | 行为 |
| --- | --- |
| `createNoopStorage()` | 读写均为空操作，`get` 返回 `null` |
| `createNoopAudio()` | `preload` resolve `0`，`play` 返回安全空 handle |
| `createNoopInput()` | 所有 `on*` / `off*` 为空操作 |
| `createNoopLifecycle()` | 所有订阅为空操作 |
| `createNoopResource()` | `resolve` 返回 `null`，加载方法 reject `resource capability unavailable` |
| `createNoopSystem()` | 返回全零设备信息与 `platform: 'h5'` |
| `createNoopScreen()` | 返回 `0` 尺寸、`portrait`，不能改方向 |
