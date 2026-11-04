# 能力支持矩阵

| 能力 | H5 | 微信 / 抖音小游戏 |
| --- | --- | --- |
| storage | `localStorage` | `wx/tt` 同步存储 |
| audio | `HTMLAudioElement` | `createInnerAudioContext` |
| input 指针 | Pointer Events | 触摸事件 |
| input 键盘 / 滚轮 | 支持 | no-op |
| lifecycle | `visibilitychange` | `onShow` / `onHide` |
| resource | `fetch` / `Image` | 包内文件优先，`baseUrl` 回退网络 |
| system | UA / `window` / `screen` | `getSystemInfoSync` 等 |
| screen 改方向 | `screen.orientation.lock`（支持时） | `setDeviceOrientation`（支持时） |

接口定义见 [平台能力](../capabilities/README.md)。
