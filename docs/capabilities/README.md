# 平台能力（RAL）

能力接口 + 每平台实现 + no-op 降级。游戏脚本只依赖接口，不直接访问 `window` / `wx` / `tt`。

## CapabilityBundle

```ts
interface CapabilityBundle {
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  resource: IResource;
  system: ISystem;
  screen: IScreen;
}
```

`GameContext` 中的 `load` 就是 `CapabilityBundle.resource`。

所有能力都实现 `Capability`（定义见 [跨端基础类型](../runtime/types.md)）：`name`、`available`，可选 `bind` / `dispose`。

## 接口清单

- [IStorage](./storage.md)
- [IAudio](./audio.md)
- [IInput](./input.md)
- [ILifecycle](./lifecycle.md)
- [IResource](./resource.md)
- [ISystem](./system.md)
- [IScreen](./screen.md)
- [no-op 降级](./noop.md)

各平台实现见 [平台能力工厂](../platforms/README.md)，能力差异见 [支持矩阵](../platforms/matrix.md)。
