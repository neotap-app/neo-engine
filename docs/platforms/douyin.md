# 抖音

```ts
interface DouyinCapabilities extends CapabilityBundle {}

function getDouyinAPI(): unknown;
function createDouyinCapabilities(options?: MinigameCapabilityOptions): DouyinCapabilities;
function createDouyinRuntimeEnvironment(options?: MinigameCapabilityOptions): {
  canvas: MinigameCanvas;
  requestFrame: FrameRequest;
  cancelFrame: FrameCancel;
  capabilities: CapabilityBundle;
};
```

`getDouyinAPI()` 返回全局 `tt`。两个创建函数在找不到 `tt` 时抛 `douyin runtime (tt) not found`。

实现与参数见 [小游戏能力](./minigame/capabilities.md) / [Runtime 环境](./minigame/runtime-environment.md)。
