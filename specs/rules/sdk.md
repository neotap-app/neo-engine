# SDK 规范（packages/neo-engine）

`@neotap.app/neo-engine` 的编码约束与最高规则。目录结构见 [/specs/overview/architecture.md](/specs/overview/architecture.md)，
引擎需求与决策见 [/specs/features/neo-engine/README.md](/specs/features/neo-engine/README.md)。

## 边界约束

- **纯客户端运行时，禁止 node 依赖**：不 import node 内置模块（`fs` / `path` / …）、不使用 `process` / `Buffer`，
  devDependencies 不引入 `@types/node`；tsup 的 `dts`/`lib` 仅面向浏览器（`DOM`）
- 游戏脚本与宿主只通过 SDK 公共入口（`.` 导出，即 `src/sdk/index.ts`）引用；内部子路径不对游戏工程暴露
- 引擎依赖 `phaser` / `three` 视为外部（tsup `external`），不打包进产物
- 包产物 `dist/` 不入库；`package.json` 的 `exports` 指向 `dist`

## 平台能力（RAL）

- 游戏脚本只依赖能力接口（`IStorage` / `IAudio` / `IInput` / `ILifecycle` / `IResource` / `ISystem` / `IScreen`，见 `types/game-context/`），**禁止直接用 `window` / `wx` / `tt` 等全局**
- 平台能力实现放 `src/sdk/platforms/<platform>/`；无 DOM 小游戏的公共逻辑放 `platforms/minigame/`（基于 `MinigameAPI` 抽象），`wechat/` 与 `douyin/` 只做 `wx.*` / `tt.*` 薄封装 + 自动检测
- 跨端类型契约：`ICanvas`（`width` / `height` / `getContext` / 可选 `remove`）与 `CanvasHost`（`appendChild`）定义在 `types/game-context/types.ts`；`GameContext.canvas`、`CapabilityBindings.canvas`、`RuntimeOptions.canvas` / `mount` 一律使用该契约，**禁止**在平台无关层引用 `HTMLElement` / `HTMLCanvasElement`
- 小游戏 DOM shim 约束：adapter 构造期**禁止**引用全局 `document` / `window`（真机无这些全局）；`Image` / `Audio` 必须由 `MinigameAPI` 的 `createImage` 或全局 `createImage` 派生；`install()` 必须幂等，`document.createElement` 不得回落到 shim 自身（避免自递归）
- 无实现的能力一律 **no-op 降级**，接口预留扩展点（震动 / 分享 / 埋点 / 广告 / 支付 / 登录等后补，**不改架构**）
- 新增平台 = 新增 `platforms/<platform>/` 实现 + 自动检测，不改调用方
- 方向/屏幕信息：小游戏侧基于 `MinigameAPI` 抽象（`getSystemInfoSync` / `setDeviceOrientation` / `onDeviceOrientationChange`），方向判定以 `windowWidth`/`windowHeight` 为准（微信文档提示 iOS 横屏 `deviceOrientation` 可能不准）
- 资源 key = 相对工程 `assets/` 的路径，也接受 `assets/` 与 `./assets/` 前缀；统一经 `types/game-context/resource.ts` 的 `normalizeAssetKey` / `assetPath` 归一化为 `assets/<路径>`
- 资产按 public 目录语义直接寻址：key 只能是对 `assets/` 的相对路径；空 key、`..` 穿越、绝对 URL/协议、`/` 或 `//` 开头一律拒绝（`assetPath` 返回 null，加载器报 `invalid resource key`）。构建期可生成 `assets-manifest.json` 与 `.neo/assets.d.ts` 作为可选元数据/类型，**不是寻址必需**（见 `specs/features/neo-engine/asset-pipeline.md`）
- `IResource` 契约：`resolve(key)` 返回平台可寻址来源（H5 为 `remote`，小游戏为 `local`）；`load<T>` 保持 JSON 语义；类型化加载固定为 `loadText` / `loadBinary` / `loadImage`，新增资产类型走扩展而非改语义
- `loadImage` 返回平台无关 `IImage`（`{ key, source, width, height, url?, dispose? }`），**不返回 `HTMLImageElement`**；`source` 为平台原生图片对象，游戏按目标平台自行断言或走引擎抽象
- H5 资源：URL = `joinAssetUrl(baseUrl, assetPath(key))`，`baseUrl` 来自 `import.meta.env.BASE_URL`；文本/二进制/JSON 走 `fetch`，图片走 `new Image()` 并包成 `IImage`。小游戏资源：优先 `getFileSystemManager().readFileSync` 读包内相对路径；显式配置 `baseUrl` 时才退回 `request`；图片走 `api.createImage` 或全局 `createImage` 并包成 `IImage`，不可用时明确 reject
- 音频不并入 `IResource`：`IAudio` 通过 `IResource.resolve(key)` 取得来源，提供 `preload(key)`、`play(key, options): AudioHandle`（并发/重启/结束与错误回调）、`setMasterVolume` / `setMuted` / `unlock`；`IResource` 不承担解码/播放职责（见 `specs/features/neo-engine/resource-audio.md`）
- 存储命名空间：key 统一为 `neo:<namespace>:<key>`；`<namespace>` 由 manifest 派生（优先 `manifest.name`，缺省 `'game'`）并用 `encodeURIComponent` 编码，避免中文/特殊字符碰撞；`prefix` 仍可由调用方覆盖。`clear()` 只删除当前 namespace 前缀的 key；小游戏端拿不到 `getStorageInfoSync().keys` 时宁可不删，**禁止**调用 `clearStorageSync()` 清空整个小游戏存储
- 输入坐标：H5 `IInput` 绑定 canvas（`IInput.bind` / `H5InputOptions.target` 兼容独立使用）；以 `canvas.getBoundingClientRect()` 换算 `x = (clientX - rect.left) * canvas.width / rect.width`（y 同理），`rect.width` / `rect.height` 为 0 时回退 `canvas.width` / `canvas.height`，保证 `Scale.FIT` 缩放 + 居中下仍是画布内坐标
- 输入能力：`PointerEventData` 含 `pointerId` / `pointerType` / `isPrimary` / `inside`，支持多点与 `pointercancel`；另有 `onWheel` 与 `onKeyDown` / `onKeyUp`。所有 `on*` 都配套 `off*` 解绑，`dispose()` 清理全部监听。小游戏无键盘/滚轮能力时对应注册为 no-op（见 `specs/features/neo-engine/input.md`）

## 能力生命周期与宿主清理

- `Capability` 可选 `bind?(bindings: CapabilityBindings)` 与 `dispose?()`；`CapabilityBindings` 至少含 `canvas: ICanvas`，可含 `game?: unknown`
- runtime 创建 canvas（2D 还需创建 `Phaser.Game`）后对所有能力调用 `bind({ canvas, game })`，宿主/引导方不再手动接线
- canvas 由宿主注入：`RuntimeOptions.canvas` 直接使用既有 canvas（小游戏上屏 canvas）；否则用 `createCanvas: () => ICanvas` 工厂创建并挂到 `mount.element`；无 DOM 且未提供 canvas 时抛明确错误。3D 帧调度可注入 `requestFrame` / `cancelFrame`，缺省回退全局 `requestAnimationFrame`，再回退 `setTimeout`。小游戏引导代码必须注入 adapter 提供的 `requestFrame` / `cancelFrame`，不得依赖被 shim 改写后的全局
- adapter 的帧调度必须在 `install()` 前捕获宿主 `requestAnimationFrame` / `cancelAnimationFrame`；shim 自身不得再读取同名全局（否则宿主缺失该能力时自递归）
- `runtime.unmount()` 必须幂等、可重复调用且不抛错，顺序为：取消 3D RAF → 取消生命周期订阅 → 所有能力 `dispose()` → `instance.destroy`（try/catch）→ 2D `game.destroy(true)`（try/catch）→ 3D `renderer.dispose()` / `forceContextLoss?.()` → 移除 **runtime 自己创建的** canvas（宿主注入的 canvas 保留）→ 重置状态
- `ILifecycle` 同时提供 `onShow` / `offShow` 与 `onHide` / `offHide`；mount 后订阅，`onHide` 暂停（2D `game.loop.pause()`，3D 停止 RAF），`onShow` 恢复，unmount 时退订
- H5 的 input / lifecycle / screen 在 `dispose()` 中移除注册的全部 DOM 监听；H5 音频的播放器 Map 必须 per-instance，dispose 只影响当前 runtime
- 小游戏能力在 `dispose()` 中优先调用对应 `off*`，缺失时清空本地监听数组，避免影响其他实例

## 错误边界

- `RuntimeOptions` 支持可选 `onError?: (error: unknown) => void`（2D / 3D、H5 / 小游戏一致）
- `runtime.mount()` 整体 try/catch：失败时执行与 unmount 等价的清理、复位状态（允许重试）、调用 `onError` 后**重新抛出**，调用方仍可 catch
- 生成的引导代码（H5 / dev / 小游戏）对 `mount` 使用 `.catch(...)`，统一上报：`console.error`、`window.dispatchEvent(new CustomEvent('neo:error', { detail }))`、向挂载点写入可见兜底文案；同时监听 `window` 的 `error` / `unhandledrejection` 并复用同一上报函数
- 无 `window` 的小游戏环境必须先 `typeof window !== 'undefined'` 判断；无 DOM 时只保证不抛错，不强求视觉兜底

## 引擎外壳

- `runtime/` 只做编排（加载包 / 选引擎 / 生命周期），渲染与场景逻辑交给 Phaser（2D）/ Three.js（3D）
- 2D 与 3D **互不混合渲染**：由 `GameMode`（`'2d' | '3d'`）选择引擎，两者不共享渲染上下文
- `createRuntime().mount()` 把 `CapabilityBundle` 的全部能力挂到 `GameContext` 供游戏脚本使用：
  `storage` / `audio` / `input` / `lifecycle` / `load`（即 `IResource`）/ `system` / `screen`；
  2D 与 3D 上下文共享同一份基础能力字段，新增能力必须同时加入 `GameContext` 与 runtime 的 `base`
- manifest 由引导方通过 `RuntimeOptions.manifest` 注入，运行时原样挂到 `GameContext.manifest`（2D / 3D 一致，未注入为 `null`）
