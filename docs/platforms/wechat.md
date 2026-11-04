# 微信

```ts
interface WechatCapabilities extends CapabilityBundle {}

function getWechatAPI(): unknown;
function createWechatCapabilities(options?: MinigameCapabilityOptions): WechatCapabilities;
function createWechatRuntimeEnvironment(options?: MinigameCapabilityOptions): {
  canvas: MinigameCanvas;
  requestFrame: FrameRequest;
  cancelFrame: FrameCancel;
  capabilities: CapabilityBundle;
};
```

`getWechatAPI()` 返回全局 `wx`。两个创建函数在找不到 `wx` 时抛 `wechat runtime (wx) not found`。

实现与参数见 [小游戏能力](./minigame/capabilities.md) / [Runtime 环境](./minigame/runtime-environment.md)。
