# 小游戏 Runtime 环境

```ts
function createMinigameRuntimeEnvironment(
  api: MinigameAPI,
  options?: MinigameCapabilityOptions,
): {
  canvas: MinigameCanvas;
  requestFrame: FrameRequest;
  cancelFrame: FrameCancel;
  capabilities: CapabilityBundle;
};
```

- 先调用 adapter 的 `install()` 安装 DOM shim；
- 返回 `canvas`、`requestFrame`、`cancelFrame` 与能力包；
- 生成的引导代码应把这些值传给 `runtime.mount`，**不要**依赖被 shim 改写后的全局。

```ts
const env = createMinigameRuntimeEnvironment(api, { manifest });

runtime.mount({
  canvas: env.canvas,
  requestFrame: env.requestFrame,
  cancelFrame: env.cancelFrame,
  capabilities: env.capabilities,
  manifest,
  loadInstance: async () => entry,
});
```

Adapter 细节见 [DOM shim Adapter](./adapter.md)，能力见 [小游戏能力](./capabilities.md)。
