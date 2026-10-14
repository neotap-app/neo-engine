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

## 引擎外壳

- `runtime/` 只做编排（加载包 / 选引擎 / 生命周期），渲染与场景逻辑交给 Phaser（2D）/ Three.js（3D）
- 2D 与 3D **互不混合渲染**：由 `GameMode`（`'2d' | '3d'`）选择引擎，两者不共享渲染上下文
