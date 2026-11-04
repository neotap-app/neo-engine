# ILifecycle

```ts
interface ILifecycle extends Capability {
  onShow(listener: () => void): void;
  offShow(listener: () => void): void;
  onHide(listener: () => void): void;
  offHide(listener: () => void): void;
}
```

`runtime.mount` 会自动订阅该能力并暂停/恢复游戏；游戏通常无需再手动处理。

- 2D：隐藏时 `game.loop.pause()`，显示时 resume。
- 3D：隐藏时停止 RAF，显示时恢复。
- `unmount` 时自动退订。
