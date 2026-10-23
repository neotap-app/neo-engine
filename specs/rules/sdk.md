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
- 无实现的能力一律 **no-op 降级**，接口预留扩展点（震动 / 分享 / 埋点 / 广告 / 支付 / 登录等后补，**不改架构**）
- 新增平台 = 新增 `platforms/<platform>/` 实现 + 自动检测，不改调用方
- 方向/屏幕信息：小游戏侧基于 `MinigameAPI` 抽象（`getSystemInfoSync` / `setDeviceOrientation` / `onDeviceOrientationChange`），方向判定以 `windowWidth`/`windowHeight` 为准（微信文档提示 iOS 横屏 `deviceOrientation` 可能不准）
- 资源 key = 相对工程 `assets/` 的路径，也接受 `assets/` 与 `./assets/` 前缀；统一经 `types/game-context/resource.ts` 的 `normalizeAssetKey` / `assetPath` 归一化为 `assets/<路径>`
- 资产按 public 目录语义直接寻址，**当前没有 manifest**：key 只能是对 `assets/` 的相对路径；空 key、`..` 穿越、绝对 URL/协议、`/` 或 `//` 开头一律拒绝（`assetPath` 返回 null，加载器报 `invalid resource key`）
- `IResource` 契约：`resolve(key)` 返回平台可寻址来源（H5 为 `remote`，小游戏为 `local`）；`load<T>` 保持 JSON 语义；类型化加载固定为 `loadText` / `loadBinary` / `loadImage`，新增资产类型走扩展而非改语义
- H5 资源：URL = `joinAssetUrl(baseUrl, assetPath(key))`，`baseUrl` 来自 `import.meta.env.BASE_URL`；文本/二进制/JSON 走 `fetch`，图片走 `new Image()`。小游戏资源：优先 `getFileSystemManager().readFileSync` 读包内相对路径；显式配置 `baseUrl` 时才退回 `request`；图片走 `api.createImage` 或全局 `createImage`，都不可用时明确 reject
- 音频不并入 `IResource`：按 `resolve(key)` 得到来源后交给现有 `IAudio` 播放；`IResource` 不承担解码/播放职责

## 引擎外壳

- `runtime/` 只做编排（加载包 / 选引擎 / 生命周期），渲染与场景逻辑交给 Phaser（2D）/ Three.js（3D）
- 2D 与 3D **互不混合渲染**：由 `GameMode`（`'2d' | '3d'`）选择引擎，两者不共享渲染上下文
- `createRuntime().mount()` 把 `CapabilityBundle` 的全部能力挂到 `GameContext` 供游戏脚本使用：
  `storage` / `audio` / `input` / `lifecycle` / `load`（即 `IResource`）/ `system` / `screen`；
  2D 与 3D 上下文共享同一份基础能力字段，新增能力必须同时加入 `GameContext` 与 runtime 的 `base`
- manifest 由引导方通过 `RuntimeOptions.manifest` 注入，运行时原样挂到 `GameContext.manifest`（2D / 3D 一致，未注入为 `null`）
