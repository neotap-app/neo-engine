# Neo Engine

基于 Phaser（2D）+ Three.js（3D）的 JS 多平台编译游戏引擎。AI 创作小游戏的核心运行与构建底座。

- 代码归属：`/packages/neo-engine`（SDK 客户端运行时）+ `/packages/neo-engine-tools`（构建工具 + CLI，Node 侧）
- 平台：首期 = NeoTap(H5 共享宿主) / 微信小游戏 / 抖音小游戏 / H5；后续 = Capacitor 移动端 / 桌面端(暂缓) / 其他 H5-like 小程序平台(逐个加)

## 核心决策（2026-10 决策记录）

| 维度 | 决策 |
| --- | --- |
| 游戏形态 | 混合：原工程 = 场景数据(JSON) + 类型化脚本(TS)；构建期静态校验，禁止 DOM/浏览器专属 API |
| 渲染关系 | 共享外壳（生命周期/场景切换/输入/资源/平台适配），渲染 API 不统一：**2D 用 Phaser 3.90、3D 用 Three.js**；场景数据 `mode: '2d'\|'3d'` 选引擎，两者互不混合渲染 |
| 3D 内 2D UI | **Three 内置正交相机 UI 层**（Sprite/CanvasTexture/命中检测 + 内置 UI 组件）。**推翻早期「Phaser+Three 共享上下文混合渲染」决策**：Phaser 3 无外部渲染后状态恢复 API（需 hack 私有字段）、Phaser 4 该能力一等支持但小游戏适配为零，权衡后放弃混合渲染，两引擎解耦、互不共享 context |
| 引擎选型 | **Phaser 3.90（锁定版本）+ Three.js**。Phaser 4（4.2.x）功能/混合渲染架构更优但小游戏适配完全空白 + AI 裸生成正确率低，**列为技术跟踪项**：跑通微信/抖音最小 Phaser 4 场景 spike 后再评估迁移（见 [research/phaser-v3-vs-v4.md](/specs/features/neo-engine/research/phaser-v3-vs-v4.md)） |
| 引擎宿主 | 双轨：H5/NeoTap 走共享宿主（游戏包只带数据+脚本）；微信/抖音小游戏内置运行时 |
| 编译管线 | 三段式：原工程（唯一源码）→ 转译（平台特定人类可读源码）→ 编译（平台特定工具链出发布包）。**转译用 vite**（bundle 锁定 CommonJS+ES5，禁 eval/new Function、Proxy 不可用），**编译/发布用平台官方工具**（微信 `miniprogram-ci` 支持 `type:'miniGame'`；抖音走 IDE/IDE CLI 上传，`@douyin-minigame/cli` 非上传工具）。无成熟 vite 小游戏插件，自组装最低风险（见 [research/build-toolchain.md](/specs/features/neo-engine/research/build-toolchain.md)） |
| 小游戏适配 | 官方 adapter 基线（抖音 `tt-adapter` 明确支持 three/phaser 且有官方 demo；微信 `weapp-adapter` 官方自述「模拟远不完整仅作参考」）+ 薄平台分派层（`typeof wx !== 'undefined' ? wx : tt`）+ 补丁；**必须 vendor 进仓库**（两侧官方 adapter 均非活跃开源）。注意抖音命名空间是 `tt.*` 不是 `dd.*`（见 [research/minigame-adapter.md](/specs/features/neo-engine/research/minigame-adapter.md)） |
| 分包 | 转译阶段可配置分包策略 + 资源远程/集成可选 |
| 产物格式 | 平台无关 manifest + 每平台产物；宿主平台的静态资源托管后续按需适配，不硬 fit 现状 |
| 平台能力(RAL) | 能力接口（IStorage/IAudio/IInput/ILifecycle/…）+ 每平台实现 + 能力降级 |
| 首期开放能力 | **仅本地存储 + 音频播放**。引擎必需项（资源加载/输入/生命周期/渲染上下文）随外壳默认提供；震动/分享/埋点/广告/支付/登录均后置，但接口预留扩展点，后补不改架构 |
| 资源寻址 | `IResource.resolveAsset(key)` 统一 resolver：`/xxx` → `assets/xxx`，H5 返回带 base 的 URL、小游戏返回包内相对路径；资产清单不参与寻址 |
| 移动端 | Capacitor（复用 H5 产物）。当前稳定 v8（Node≥22）；官方游戏指南首推 Phaser+Capacitor；壳内嵌宿主运行时、UGC 游戏产物远程加载；存储走 `@capacitor/preferences` 勿用 localStorage；iOS 需隐私清单、国内安卓需备案+软著（见 [research/capacitor.md](/specs/features/neo-engine/research/capacitor.md)） |
| 桌面端 | 暂缓（Tauri/Electron 皆可，后续再定） |
| 其他平台 | 逐个加平台实现（延续社区 adapter 优先策略），不引入 Taro/uni-app |
| 工程归属 | **两包分离**：`@neotap.app/neo-engine` 只含客户端 SDK（`src/sdk`，游戏脚本与宿主引用）；`@neotap.app/neo-engine-tools` 含构建工具 + CLI（`src/build` + `src/cli`，Node 侧，依赖 SDK）。宿主平台（AI 创作侧）注入提示词 + SDK 供 sandbox 内测试/验证/构建（暂不支持 sandbox 内发布构建）；原工程上传平台审核，平台用**无头构建服务**（`@neotap.app/neo-engine-tools/build`）构建/发布 |

## 工程约定（约定优于配置）

### 默认空项目结构

```
<项目根>/
  package.neo.json   # manifest
  src/
    index.ts          # 入口，export default 一个 NeoGameInstance
  assets/             # 资产目录（贴图/音频/场景数据等）
```

- 入口约定固定 `src/index.ts`，`export default` 一个 `NeoGameInstance`（由 SDK 提供类型）
- 资产约定放 `assets/`，按 public 目录语义构建时默认全部原样打包
- 后续预留 `neo.config.mts`（类似 next.config.mts，可自定义打包步骤/插件/asset 过滤优化）——**现在不做**，见 [未来规划](#未来规划)

### 资产管线（assets）

- 约定：工程 `assets/**` 原样镜像到产物 `assets/**`（public 目录行为，保持目录结构），游戏按路径直接访问；**不生成资产清单，也不做构建期 key 校验**，新增资产无需声明
- 逻辑 key = 相对 `assets/` 的路径，也接受 `/`、`assets/`、`./assets/` 前缀，如 `/textures/plant.png`、`textures/plant.png`、`assets/textures/plant.png`、`./assets/textures/plant.png` 等价
- key 校验：空 key、`..` 穿越、绝对 URL/协议、`//` 开头一律拒绝
- 运行时：`ctx.load` 即 `IResource`；`resolveAsset(key)` 是统一 resolver
  ```ts
  await ctx.load.loadText('/data/config.txt');
  const buf = await ctx.load.loadBinary('/data/save.bin');
  const image = await ctx.load.loadImage('/textures/plant.png');
  const json = await ctx.load.load<SceneData>('/data/scene.json');
  const url = ctx.load.resolveAsset('/audio/bgm.mp3');
  ```
- H5：`resolveAsset` 返回 `joinAssetUrl(baseUrl, assetPath(key))`，bootstrap 传入 `baseUrl: import.meta.env.BASE_URL`；文本/二进制/JSON 走 `fetch`，图片走 `new Image()`
- 小游戏：`resolveAsset` 返回包内相对路径 `assets/...`；文本/二进制优先 `getFileSystemManager().readFileSync` 读包内文件，显式配置 `baseUrl` 时才退回 `request`；图片走 `api.createImage` / 全局 `createImage`，不可用时明确 reject
- 外部组件：Three.js 等通过 `ctx.load.resolveAsset` 复用同一套寻址，如 `manager.setURLModifier((url) => ctx.load.resolveAsset(url) ?? url)`
- 音频不在 `IResource` 内：`IAudio` 用 `resolve(key)` 取得来源，支持 `preload(key)` 与 `play(key, options): AudioHandle`（每次播放独立实例，可并发/重启，带 `onEnded` / `onError`）
- 后续可追加 sprite sheet 合并 / 多分辨率变体 / 预加载（非寻址必需，见 [asset-pipeline.md](/specs/features/neo-engine/asset-pipeline.md)）


### manifest（`package.neo.json`，仅 4 字段）

```jsonc
{
  "name": "游戏名",          // 任意语言
  "version": "1.0.0",        // semver
  "engine": "neo-engine@0.1.0",
  "entry": "src/index.ts"     // 游戏入口，js 或 ts 文件
}
```

- 分包 / tree-shake：由构建器基于 entry 的 **ES6 import 图**解析自动完成，无需声明 scenes/assets
- 打包参数（分包策略 / 资源远程-本地 / 平台 target 等）**打包时才传入** CLI，不进 manifest
- **引擎版本校验**：`readManifest` 是唯一强制校验点（build 与 `neo lint` 都经过它），将 `engine` 声明版本与实际安装的 `@neotap.app/neo-engine` 版本（读取其 `package.json`，不硬编码）**精确比对**；不一致直接报错，信息包含声明版本、安装版本与 manifest 路径。首期不做 semver 范围匹配
- **manifest 运行时暴露**：生成的引导代码（H5 / 小游戏）内嵌 manifest JSON 并构造 `NeoManifest`，通过 `runtime.mount({ manifest })` 注入；运行时将同一实例挂到 `GameContext.manifest`（2D / 3D 一致），游戏脚本据此读取 `name` / `version` / `engine`。未注入时 `manifest` 为 `null`

## 编译管线

### 三段式

1. **原工程**：唯一源码（manifest + src + assets），AI 产出，上传平台审核
2. **转译**：产出平台特定、人类可读的源码（如小游戏包结构、共享宿主 bundle）
3. **编译**：用平台特定工具链产出最终发布包

- 工具链选型：**转译用 vite（CommonJS+ES5）、编译/发布用平台官方工具**，见 [research/build-toolchain.md](/specs/features/neo-engine/research/build-toolchain.md)
- 分包限制（微信主包 4M/总包 30M/单分包不限；抖音总包 20M/主包 4M/单分包 20M），详见 [research/build-toolchain.md](/specs/features/neo-engine/research/build-toolchain.md)
- 发布产物 = 平台无关 manifest + 各平台产物引用；审核用原工程（含源码）

### 构建接口（`@neotap.app/neo-engine-tools/build`）

- 构建逻辑位于 `packages/neo-engine-tools/src/build/`，暴露编程接口（**不依赖 CLI**），供平台**无头构建服务**直接调用：
  ```ts
  import { buildProject } from '@neotap.app/neo-engine-tools/build';
  await buildProject({ cwd, target: 'h5' | 'wechat' | 'douyin', outDir, base });
  ```
- CLI 的 `build` 命令是薄壳，解析 argv 后调用 `buildProject`
- H5 的 `base` **默认 `'./'`**（相对资源路径，根路径/子路径均可部署）；同时影响 **HTML/JS chunk URL** 与 public `assets/` 目录（P0-2 落地后 assets 原样拷贝、按同一 base 相对访问、无 manifest）
- 子路径或 CDN 托管用 `base` / `--base` 覆盖（如 `/games/pvz`）。API 与 CLI 共用 `normalizeH5Base`：自动补尾 `/`（`/games/pvz` ≡ `/games/pvz/`，`game/` 保持相对），保留 `./`、`https://`、`//` 形态，拒绝空/纯空白
- 该参数**仅 H5 生效**，小游戏 target 忽略

## 目录结构（SDK / Tools 两包分离）

```
packages/neo-engine/src/          # @neotap.app/neo-engine：客户端 SDK 运行时
  index.ts                        # SDK 公共入口（= sdk/index.ts）
  sdk/
    manifest/index.ts             # manifest 解析实体类 NeoManifest（parse/fromObject/校验）
    types/
      game.ts                     # NeoGameInstance / GameContext / GameMode
      game-context/               # RAL 能力接口（原 capabilities）：audio/input/lifecycle/
                                  # resource/storage/types + CapabilityBundle + no-op 降级
    runtime/                      # createRuntime 外壳（加载包/编排引擎/生命周期）
    platforms/                    # 平台能力实现 + DOM shim
      h5/  minigame/  wechat/  douyin/

packages/neo-engine-tools/src/    # @neotap.app/neo-engine-tools：构建工具 + CLI（Node 侧，依赖 SDK）
  build/
    index.ts  types.ts  common.ts  assets.ts
    platforms/                    # 平台特定构建
      h5.ts  wechat.ts  douyin.ts  minigame.ts（小游戏共享：双 chunk 保证 adapter 先于引擎）
  cli/
    bin.ts  index.ts  build.ts  lint.ts
```

- 包导出：SDK 为 `.`；Tools 为 `.`/`./build`（无头构建接口）/`./cli`，`bin: neo`
- SDK 与 Tools 边界：`neo-engine` 是运行时（游戏脚本 + 宿主，纯客户端无 node 依赖）；`neo-engine-tools` 是 Node 侧构建/CLI

### 平台 target（首期）

| target | 运行时 | 说明 | 状态 |
| --- | --- | --- | --- |
| `h5` | shared（共享宿主） | NeoTap feed 内嵌 + 独立 H5；默认相对资源路径，可用 `base` 指定子路径/CDN 前缀（同时作用于 HTML/JS chunk 与 `assets/`） | ✅ 已实现（独立 H5 产物 + 浏览器验证） |
| `wechat` | bundled（内置运行时） | 微信小游戏包 | ✅ 已实现（game.js/game.json/project.config.json 双 chunk 产物，待真机验证） |
| `douyin` | bundled | 抖音小游戏包 | ✅ 已实现（同上，`tt.*`） |

后续：`capacitor`（移动端，复用 H5 产物）、桌面端（暂缓）、其他小程序平台逐个加。

## 平台能力抽象（RAL）

- 能力接口 + 每平台实现（`h5` / `wechat` / `douyin` / …）+ 能力降级（无实现则 no-op）
- 首期仅实现：`IStorage`（本地存储）、`IAudio`（音频播放）
- 引擎必需接口随外壳：`IResource`（资源寻址 + JSON/文本/二进制/图片加载，`loadImage` 返回平台无关 `IImage`）、`IInput`（指针/多点/滚轮/键盘 + `off*` 解绑）、`ILifecycle`（前后台/onShow/onHide）、渲染上下文
- 音频：`IAudio` 通过 `IResource.resolve` 寻址，支持 `preload`、每次 `play` 返回 `AudioHandle`（可并发/重启，带结束与错误回调）、`setMasterVolume` / `setMuted` / 首次手势 `unlock`
- 环境信息：`ISystem`（`getEnvironmentInfo` → 平台 + 运行时 + 设备信息）；屏幕信息：`IScreen`（屏幕尺寸/像素比/安全区、获取/监听/取消监听方向、能否及请求主动改方向）
- 游戏脚本只依赖接口，禁止直接用 `window` / `wx` / `tt` 全局
- 能力生命周期：`Capability` 可选 `bind({ canvas, game })` / `dispose()`；runtime 创建 canvas（2D 含 `Phaser.Game`）后统一 bind，`unmount` 依次取消 3D RAF / 生命周期订阅、dispose 所有能力、销毁实例与 Phaser game、释放 3D renderer、移除 canvas 并复位状态（幂等、可反复 mount/unmount）
- 跨端外壳：canvas / mount 使用平台无关的 `ICanvas` / `CanvasHost` 契约；宿主可注入 `canvas`（小游戏上屏 canvas，unmount 不移除）或 `createCanvas` 工厂（H5），3D 帧调度可注入 `requestFrame` / `cancelFrame`，无 DOM 时不再依赖全局 `document` / `requestAnimationFrame`
- 小游戏 adapter：构造期不引用全局 `document` / `window`，`Image` / `Audio` 由 `MinigameAPI.createImage` 或全局 `createImage` 派生，`install()` 幂等，`document.createElement` 不回落到 shim 自身；帧调度在 install 前捕获宿主 rAF，并把 `requestFrame` / `cancelFrame` 交给 runtime
- `ILifecycle` 提供 `onShow`/`offShow`、`onHide`/`offHide`；mount 后订阅，隐藏暂停（2D `game.loop.pause()`，3D 停止 RAF）、显示恢复
- 输入坐标：H5 绑定 canvas，按 `getBoundingClientRect()` 与画布内部分辨率换算，兼容 `Scale.FIT` 缩放/居中；`H5InputOptions.target` 仅作独立使用入口。支持 `pointerId` 多点、`pointercancel`、滚轮、键盘（H5 `window`）与全部 `off*` 解绑；小游戏无键盘/滚轮时降级为 no-op
- 存储命名空间：实现按 `neo:<namespace>:` 隔离，namespace 由 manifest 名称编码派生（缺省 `game`）；`clear()` 只清当前 namespace，小游戏拿不到 key 列表时不清空全部存储
- 错误边界：`RuntimeOptions.onError` 接收 mount 失败；生成的引导代码统一 `.catch` 上报（`console.error` + `neo:error` 事件 + 可见兜底文案），并监听 `error` / `unhandledrejection`
- 预留扩展点（后补不改架构）：震动 / 分享 / 埋点 / 广告 / 支付 / 登录 / 网络请求
- 实现：`packages/neo-engine/src/sdk/platforms/h5/`（真 DOM）、`minigame/`（共享 DOM shim + 能力，基于 `MinigameAPI` 抽象）、`wechat/` 与 `douyin/`（`wx.*` / `tt.*` 薄封装 + 自动检测）
- 方向/屏幕：小游戏侧方向监听走 `wx/tt.onDeviceOrientationChange`，判定以 `windowWidth`/`windowHeight` 为准（微信文档提示 iOS 横屏 `deviceOrientation` 可能不准）；主动改方向走 `wx/tt.setDeviceOrientation`

## 相关

- 宿主平台集成（静态资源托管、AI 创作 studio-agent 等）属于平台仓库，不在本仓库范围；本仓库只维护平台无关的引擎 SDK 与构建工具

## 调研索引

- [research/build-toolchain.md](/specs/features/neo-engine/research/build-toolchain.md) — 小游戏构建工具链、包体/分包限制、JS 语法约束（B1 选型结论）
- [research/minigame-adapter.md](/specs/features/neo-engine/research/minigame-adapter.md) — Phaser/Three 在小游戏无 DOM 环境的适配现状（B2 选型结论）
- [research/phaser-v3-vs-v4.md](/specs/features/neo-engine/research/phaser-v3-vs-v4.md) — Phaser 3 vs 4 权衡（引擎选型 + Q2 决策推翻）
- [research/capacitor.md](/specs/features/neo-engine/research/capacitor.md) — Capacitor 打包 H5 游戏（D1 落地建议）

## 未来规划

- `neo.config.mts`：自定义打包步骤 / 插件 / asset 过滤与优化（暂不做，先记录于此）
- 桌面端分发物（Tauri / Electron，暂缓）
- 其他 H5-like 小程序平台逐个加 target
- Capacitor 移动端打包
