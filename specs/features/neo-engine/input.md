# 输入能力（P1：键盘 / 滚轮 / 多点 / 解绑）

`IInput`（`types/game-context/input.ts`）在指针基础上补齐键盘、滚轮、多点触控与监听解绑，
使动作/键鼠类游戏可以只依赖 RAL，不直接访问 DOM 或 `wx` / `tt`。

## 契约

```ts
export interface PointerEventData {
  x: number;
  y: number;
  pointerId: number;
  pointerType: string; // 'mouse' | 'touch' | 'pen' | ...
  isPrimary: boolean;
  inside: boolean; // 是否落在 canvas 可视范围内
}

export interface WheelEventData {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

export interface KeyEventData {
  key: string; // KeyboardEvent.key
  code: string; // KeyboardEvent.code
  repeat: boolean;
}

export interface IInput extends Capability {
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

- `createNoopInput()` 完整实现全部 `on*` / `off*`，均为空操作，保证无输入能力的平台调用方代码一致。
- 同一 listener 重复注册只保留一份；`off*` 按引用移除，未注册时静默忽略。

## 坐标与 inside 语义

H5 输入在 `bind({ canvas })` 时绑定到 canvas；`H5InputOptions.target` 保留为独立使用入口。

- 取 `rect = canvas.getBoundingClientRect()`。
- `x = (clientX - rect.left) * canvas.width / rect.width`，y 同理；`rect.width` / `rect.height` 为 0 时回退 `canvas.width` / `canvas.height`（缩放比为 1）。
- 指针与滚轮都返回画布坐标（而非 CSS 像素），在 `Scale.FIT` 缩放 + 居中下仍可直接与游戏内坐标对齐。
- `inside` 使用**未缩放**的 client 坐标判断：`clientX` 与 `clientY` 均落在 `rect` 的四条边内为 `true`；拿不到 `rect` 时保守置 `true`。拖出 canvas 后仍会收到 move/up，只是 `inside = false`。
- 小游戏没有 canvas 边界信息，`inside` 恒为 `true`。

## 键盘

- H5 在 `window` 上监听 `keydown` / `keyup`（bind 时挂载，unbind/dispose 时移除），原样透传 `key` / `code` / `repeat`。
- 不调用 `preventDefault`，避免破坏宿主或浏览器快捷键；需要屏蔽默认行为由游戏自行判断。
- 小游戏平台无键盘能力：`onKeyDown` / `onKeyUp` 注册为空操作，`off*` 为 no-op，保持接口一致。

## 滚轮

- H5 在 canvas 上以 `{ passive: true }` 监听 `wheel`，透传 `deltaX` / `deltaY` / `deltaZ` 与画布内坐标。
- 不调用 `preventDefault`，页面滚动仍由宿主决定。
- 小游戏无滚轮能力：`onWheel` 注册为空操作，`offWheel` 为 no-op。

## 多点触控

- H5 使用 Pointer Events，多条手指天然由 `pointerId` 区分，字段原样透传；`pointerType` 缺失时回退 `'mouse'`。
- 小游戏按 `changedTouches`（为空时退回 `touches`）逐个派发，每个触点回调一次：
  - `pointerId` 取 `touch.identifier`，缺失时用该事件内的索引；
  - `pointerType` 固定 `'touch'`；
  - `isPrimary` 为触点索引 0；
  - `inside` 固定 `true`。
- `pointercancel`：H5 监听 `pointercancel`；小游戏在 `MinigameAPI` 提供 `onTouchCancel` 时转发，未提供时 `onPointerCancel` 退化为空操作。

## 解绑与 dispose

- 所有 `off*` 必须真正移除对应 listener；H5 在 DOM 侧只保留固定 handler，因此解绑不会重复注册或泄漏。
- `bind` 可被重复调用（重复 mount）：实现先解除旧绑定再重新挂载，幂等且不会累积监听。
- `dispose()` 移除全部 DOM 监听（指针、滚轮、键盘）并清空所有 listener 数组；小游戏 `dispose()` 优先调用平台 `off*`，缺失时清空本地数组，且保留 Round 1 的 `attached` 状态复位逻辑。
- 键鼠监听目标是全局的：同一页面多个 runtime 会同时收到键盘事件，游戏应只在自己可见/活跃时处理输入。
