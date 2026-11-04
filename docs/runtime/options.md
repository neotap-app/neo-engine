# RuntimeOptions

```ts
interface MountPoint {
  element: CanvasHost;
}

interface RuntimeOptions {
  mount?: MountPoint;
  capabilities: CapabilityBundle;
  manifest?: NeoManifest | null;
  canvas?: ICanvas;
  createCanvas?: () => ICanvas;
  requestFrame?: FrameRequest;
  cancelFrame?: FrameCancel;
  loadInstance: () => Promise<NeoGameInstance>;
  onError?: (error: unknown) => void;
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `capabilities` | 是 | 平台能力包，见 [CapabilityBundle](../capabilities/README.md) |
| `loadInstance` | 是 | 返回游戏入口实例；runtime 负责调用其 `create` / `destroy` |
| `mount` | 条件 | 当 runtime 自己创建 canvas 时必填，canvas 会 `appendChild` 到 `mount.element` |
| `canvas` | 否 | 直接使用宿主提供的 canvas（如小游戏上屏 canvas）；此时 `unmount` 不会移除它 |
| `createCanvas` | 否 | 自定义 canvas 工厂；未提供时回退 `document.createElement('canvas')` |
| `manifest` | 否 | 挂到 `GameContext.manifest` |
| `requestFrame` | 否 | 3D 帧调度；默认 `requestAnimationFrame`，不存在时回退 `setTimeout(..., 16)` |
| `cancelFrame` | 否 | 与 `requestFrame` 配套；默认 `cancelAnimationFrame`，不存在时回退 `clearTimeout` |
| `onError` | 否 | `mount` 失败时先清理、再回调、最后重新抛出 |

相关类型见 [跨端基础类型](./types.md)。
