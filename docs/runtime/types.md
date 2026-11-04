# 跨端基础类型

```ts
interface ICanvas {
  width: number;
  height: number;
  getContext(contextId: string, options?: unknown): unknown;
  remove?(): void;
}

interface CanvasHost {
  appendChild(node: unknown): unknown;
}

type FrameRequest = (callback: () => void) => number;
type FrameCancel = (handle: number) => void;

interface Capability {
  readonly name: string;
  readonly available: boolean;
  bind?(bindings: CapabilityBindings): void;
  dispose?(): void;
}

interface CapabilityBindings {
  canvas: ICanvas;
  game?: unknown;
}
```

| 类型 | 说明 |
| --- | --- |
| `ICanvas` | 平台无关 canvas 契约；`remove` 可选，runtime 移除自建 canvas 时使用 |
| `CanvasHost` | 挂载点契约，只要求 `appendChild` |
| `FrameRequest` / `FrameCancel` | 3D 帧调度，小游戏必须注入 adapter 提供的版本 |
| `Capability` | 所有能力的基类：名称、可用性、可选 `bind` / `dispose` |
| `CapabilityBindings` | 能力绑定时拿到 canvas，2D 额外拿到 `Phaser.Game` |
