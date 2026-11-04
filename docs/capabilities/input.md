# IInput

```ts
interface PointerEventData {
  x: number;
  y: number;
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  inside: boolean;
}

interface WheelEventData {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

interface KeyEventData {
  key: string;
  code: string;
  repeat: boolean;
}

interface IInput extends Capability {
  onPointerDown(listener: (event: PointerEventData) => void): void;
  offPointerDown(listener: (event: PointerEventData) => void): void;
  onPointerMove(listener: (event: PointerEventData) => void): void;
  offPointerMove(listener: (event: PointerEventData) => void): void;
  onPointerUp(listener: (event: PointerEventData) => void): void;
  offPointerUp(listener: (event: PointerEventData) => void): void;
  onPointerCancel(listener: (event: PointerEventData) => void): void;
  offPointerCancel(listener: (event: PointerEventData) => void): void;
  onWheel(listener: (event: WheelEventData) => void): void;
  offWheel(listener: (event: WheelEventData) => void): void;
  onKeyDown(listener: (event: KeyEventData) => void): void;
  offKeyDown(listener: (event: KeyEventData) => void): void;
  onKeyUp(listener: (event: KeyEventData) => void): void;
  offKeyUp(listener: (event: KeyEventData) => void): void;
}
```

- 所有 `on*` 都有对应 `off*`，按引用解绑。
- H5 坐标按 canvas 内部尺寸换算，兼容 `Scale.FIT` 缩放；`inside` 表示指针是否在 canvas 可视范围内。
- 小游戏只派发触摸事件，`pointerType` 为 `'touch'`，`inside` 恒为 `true`；没有键盘/滚轮时对应注册为 no-op。
- H5 键盘监听在 `window` 上，不调用 `preventDefault`。

平台差异见 [支持矩阵](../platforms/matrix.md)。
