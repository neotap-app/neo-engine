# 调研：Phaser 3 / Three.js 在小游戏（无 DOM 环境）的运行与 adapter

> 调研日期 2026-10-05。用于 B2 小游戏适配层选型。核心结论：**官方 adapter 基线 + 薄平台分派层 + 补丁，必须 vendor 进仓库**。

## 背景：两个平台都是无 BOM/DOM 的 JS 引擎环境

- 微信：iOS=JavaScriptCore / Android=V8 / 开发者工具=NW.js；基础库只提供 `wx.createCanvas`、`wx.createImage`、`RAF/定时器`，无全局 `document`/`window`。
- 抖音：iOS=JavaScriptCore / Android=V8 / 开发者工具=Electron；真机同样无 BOM/DOM。
- 来源：
  - https://developers.weixin.qq.com/minigame/dev/guide/runtime/adapter.html
  - https://developers.weixin.qq.com/minigame/dev/guide/runtime/env.html
  - https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/framework/runtime/env

## Phaser 3 官方支持现状

- **无官方微信/抖音模板仓库**（phaserjs org 检索 wechat = 0 条）；微信官方「引擎适配」清单只列 Cocos/Laya/Egret/Unity 等，Phaser 不在其中。
- Phaser 层面提供通用开关 **`customEnvironment: true`**（v3.16 起）：跳过内部特性检测，此时**必须显式 `renderType: 'CANVAS'|'WEBGL'`**。这是社区跑小游戏的钥匙。
- 抖音官方 **tt-adapter 明确声明对 phaser.js 提供「最小能力适配」，并有官方 demo（消除小球）**。
- 社区模板（参考基线，基本停更）：`akeboshi1/Phaser-wx`（Phaser 3.55.2 微信小游戏，含输入/文件加载/InnerAudio 音效适配）、`dotgreg/weixin-minigame-tutorial` 等。

来源：
- https://github.com/phaserjs/phaser/releases/tag/v3.16.0
- https://developers.weixin.qq.com/minigame/dev/guide/game-engine/engine-overview.html
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/framework/runtime/adapter

## Three.js 官方支持现状

- **mrdoob/three.js 上游没有小游戏 adapter**；小游戏侧适配全部由平台方/社区提供。
- 微信官方只在小程序（非小游戏）侧有 `threejs-miniprogram`（r108，`createScopedThreejs(canvas)`，2023 后未更新）。
- 抖音官方 **tt-adapter 声明对 three.js 提供最小能力适配，附官方 demo（五子棋）**。
- 微信小游戏跑 three.js 的现实路径：直接用上屏 canvas 作为 `renderer.domElement` + adapter 补齐 Image/XMLHttpRequest 等。

来源：
- https://github.com/wechat-miniprogram/threejs-miniprogram
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/framework/runtime/adapter

## Adapter 现状（重点）

### weapp-adapter（微信官方，仅作参考）
- 官方以 **zip 形式从文档分发**（非独立仓库维护）；预建上屏 canvas 暴露全局 `canvas`，模拟 `document.createElement / canvas.addEventListener / localStorage / Audio / Image / WebSocket / XMLHttpRequest`。
- 官方两条免责：①「对浏览器环境的模拟**远不完整**，不保证所有引擎无缝接入，更多作为参考，需自行扩展」；②「**不是小游戏基础库的一部分**」，第三方库，需项目自行引入。
- 社区 ES6 重写版 `finscn/weapp-adapter`（438★）**2019 年后停更**。
- 微信官方 org 无独立「minigame-adapter」JS 仓库（`minigame-adaptor` 是 C# 侧且已归档）。

来源：
- https://developers.weixin.qq.com/minigame/dev/guide/runtime/adapter.html
- https://github.com/finscn/weapp-adapter

### tt-adapter（抖音官方）
- 官方 zip 下载（`tt-adapter.js`），基于小游戏 JSAPI 实现部分 H5 能力；**上屏 canvas 已创建并挂全局 `window`**，再 `createCanvas` 得到离屏 canvas。
- 官方能力清单（✅/❌）：canvas✅ document✅ window✅ Audio✅ AudioContext✅ Element/Node✅ Event✅ Image✅ localStorage✅ WebSocket✅ XMLHttpRequest✅ touchEvent✅ pointerEvent✅ TextDecoder✅ location/matchMedia/navigator/performance✅ Worker✅ base64✅；**fetch❌ Blob❌ FileReader❌ URL❌ TextEncoder❌ mouseEvent❌**。
- 官方自述「模拟比较简陋，可自行扩展」；**明确声明对 three.js / phaser.js 最小适配 + 官方 demo**。

来源：
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/framework/runtime/adapter

### 一个 adapter 服务双端的可行性
- **API 结构高度同构**：`wx.*` vs `tt.*`（注意是 **tt**，不是 dd）。高频能力一一对应：createCanvas / createImage / RAF / createInnerAudioContext / onTouchStart 等 / setStorageSync / getFileSystemManager / getSystemInfoSync / request / connectSocket。
- 真正差异：命名空间（wx vs tt）需平台分派层；devtools 不同（NW.js vs Electron，仅调试）；adapter 覆盖口径不同（tt 缺 fetch/Blob/URL/TextEncoder 等，微信侧也要为 Three.js 补）；真机音频 WebAudio 支持有限（引擎音效建议走 InnerAudioContext）。
- 社区已验证多端复用：`plavip/three-minigame-adapter`（微信|淘宝|字节）。

## 适配层策略结论

1. **基线选官方而非社区**：抖音用官方 `tt-adapter`（唯一对 three/phaser 有官方声明 + demo）；微信用官方 `weapp-adapter`（zip），社区 finscn 版仅作 ES6/扩展参考。
2. **包一层薄平台分派层（自研，很薄）**：入口 `typeof wx !== 'undefined' ? wx : tt`；adapter 核心写一份，微信/抖音各一个 backend。本质是「把官方两份 zip 合成一份双端 adapter」，非从零自研。
3. **引擎侧接入**：Phaser 用 `customEnvironment:true` + 显式 renderType，canvas 直接复用全局上屏 canvas，关 DOM 依赖输入，音效换 InnerAudioContext；Three 用 `new WebGLRenderer({ canvas: window.canvas })`，补 tt-adapter 缺失的 `URL/TextDecoder`（微信同）。
4. **验证路径**：先跑抖音官方 two demos（three 五子棋 / phaser 消除小球）确认最小闭环 → 最小 POC 覆盖四主线（渲染/输入/音频/网络+存储）→ 跑不通逐个 patch。
5. **兜底自研边界**：仅当官方 adapter 缺口大到补丁失控（复杂 UI 输入、DOM 排版）才自研；对 Phaser/Three 而言官方基线+补丁已够，自研必要性低。
6. **必须 fork/vendor 进自己仓库**：两侧官方 adapter 均非持续活跃开源项目（weapp-adapter 不在 org 维护、tt-adapter zip 分发），不能依赖上游更新。

来源汇总：
- https://developers.weixin.qq.com/minigame/dev/guide/runtime/adapter.html
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/framework/runtime/adapter
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/javascript-api/overview
- https://github.com/orgs/wechat-miniprogram/repositories?q=minigame
