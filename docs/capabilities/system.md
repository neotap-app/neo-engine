# ISystem

```ts
type PlatformName = 'h5' | 'wechat' | 'douyin';

interface RuntimeInfo {
  name: string;
  version: string;
  language?: string;
  platform?: string;
}

interface DeviceInfo {
  brand?: string;
  model?: string;
  system?: string;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
}

interface EnvironmentInfo {
  platform: PlatformName;
  runtime: RuntimeInfo;
  device: DeviceInfo;
}

interface ISystem extends Capability {
  getEnvironmentInfo(): EnvironmentInfo;
}
```

- H5：`runtime.name` 为 `browser`，`runtime.version` 为完整 UA；设备信息由 UA / `window` / `screen` 推导。
- 小游戏：`runtime.name` 为平台名，`runtime.version` 取 SDK 版本；设备信息取 `getSystemInfoSync` 等接口。

平台实现见 [H5](../platforms/h5.md) / [小游戏能力](../platforms/minigame/capabilities.md)。
