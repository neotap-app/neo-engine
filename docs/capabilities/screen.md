# IScreen

```ts
type Orientation = 'portrait' | 'landscape';

interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ScreenInfo {
  width: number;
  height: number;
  pixelRatio: number;
  orientation: Orientation;
  statusBarHeight?: number;
  safeArea?: SafeArea;
}

interface IScreen extends Capability {
  getInfo(): ScreenInfo;
  getOrientation(): Orientation;
  canChangeOrientation(): boolean;
  requestOrientation(orientation: Orientation): Promise<boolean>;
  onOrientationChange(listener: (orientation: Orientation) => void): void;
  offOrientationChange(listener: (orientation: Orientation) => void): void;
}
```

- `canChangeOrientation()` 表示当前平台是否支持主动改方向。
- `requestOrientation()` resolve `true` 表示成功，`false` 表示不支持或失败。
- H5 的 `ScreenInfo` 只保证 `width` / `height` / `pixelRatio` / `orientation`；小游戏额外提供 `statusBarHeight` / `safeArea`。
- 小游戏方向判定以 `windowWidth` / `windowHeight` 为准，避免 iOS 横屏 `deviceOrientation` 不准。

平台实现见 [H5](../platforms/h5.md) / [小游戏能力](../platforms/minigame/capabilities.md)。
