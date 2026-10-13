# 调研：Phaser 3 + Three.js 共享同一 canvas/WebGL 上下文（3D + 2D UI）

> 调研日期 2026-10-05。用于 Q2「3D 游戏内 2D UI 用 Phaser 渲染」的可行性评估。**结论：可行但需自建 WebGL2 context，Phaser 3 是主要风险点，必须 spike。**

## 结论速览

| 问题 | 结论 |
|---|---|
| Phaser 3 能否用外部 canvas/context | **能**：`GameConfig.canvas` / `GameConfig.context` 官方支持 |
| 共享 context 是否可行 | **可行但需 WebGL2**：Three r163+ 只认 WebGL2；需自建 WebGL2 context 注入双方 |
| 每帧衔接 | 顺序渲染 + 每帧「重置另一引擎缓存」；Phaser 3 无公开恢复 API，需动私有字段 |
| 风险等级 | 中高；需 spike 的 4 个点见文末 |

## 关键事实

### 配置项（官方源码 v3.90.0 `src/core/Config.js`）
```js
this.canvas  = GetValue(config, 'canvas', null);   // 用你自己的 canvas
this.context = GetValue(config, 'context', null);  // 用你自己的 context
```
- 相关渲染配置：`render.transparent`、`render.clearBeforeRender`（共享时**必须 false**）、`render.antialiasGL`、`render.preserveDrawingBuffer`、`render.premultipliedAlpha`。

### Phaser 3 接管 GL 状态
- `WebGLRenderer.init` 会直接改 GL 状态并 `gl.clear()` 一次（清掉 Three 已画内容）；运行时靠内部缓存（`currentProgram/currentBlendMode/currentScissor/currentFramebuffer` + pipeline 纹理单元）做 dirty-check。
- 官方文档警告：外部 raw GL 调用会污染 WebGLRenderingContext 状态。
- **Phaser 3 没有「外部渲染后全量恢复 GL 状态」公开 API**（`setBlendMode(id, force)` 是唯一带 force 的，只管混合）。**Phaser v4（master，未发布）引入 `WebGLGlobalWrapper`（`renderer.glWrapper`），`glWrapper.update(undefined, true)` 可强制重放所有 GL 状态——专为「context loss / external render call」设计**。这是 v3 与 v4 的关键差异。

来源：
- https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/Config.js
- https://docs.phaser.io/api-documentation/class/renderer-webgl-webglrenderer
- https://github.com/phaserjs/phaser/blob/master/src/renderer/webgl/wrappers/WebGLGlobalWrapper.js

### Three 侧
- `new THREE.WebGLRenderer({ canvas, context })` 官方支持注入已有 context。
- **`resetState()`**：官方说明「mostly relevant for applications which share a single WebGL context across multiple WebGL libraries」。实现 = `state.reset()`（blend/cull/depth/scissor/stencil 全 disable、`useProgram(null)`、清 FBO/VAO 绑定、viewport/scissor 复位）。
- **`render()` 不自动重置缓存**（源码确认 `render()` 内无 `state.reset()`），切换方必须手动 reset。
- **Three r163+ 只支持 WebGL2，注入 WebGL1 context 会 throw**。

来源：
- https://threejs.org/docs/api/en/renderers/WebGLRenderer.html
- https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLRenderer.js

### context 创建一次定死
- 一个 canvas 只能 `getContext` 成功一次，属性（`antialias/depth/stencil/alpha/premultipliedAlpha/preserveDrawingBuffer`）创建时定死。必须自己先创建 context 同时注入双方。

### Phaser 3 与 WebGL2 的兼容性
- Phaser 3.60 changelog 确认支持 WebGL2 custom contexts（为快照功能改造）。
- 但 v3.90 renderer **没有 WebGL2RenderingContext 分支**，只封装 WebGL1 扩展（`ANGLE_instanced_arrays` / `OES_vertex_array_object`），WebGL2 下这些扩展返回 null —— **需 spike 验证** MultiPipeline/VAO/instancing/FX/BitmapText 在 WebGL2 下全部正常。

## 每帧衔接（推荐编排）

```
threeRenderer.resetState()          // 清 Three 缓存，防上帧 Phaser 残留
threeRenderer.render(scene, camera) // 3D（autoClear 清 color+depth+stencil）
gl.disable(DEPTH_TEST)              // 防 3D 深度遮挡 UI（必要时也 disable CULL_FACE）
[Phaser 状态恢复]
  v4: phaserRenderer.glWrapper.update(undefined, true)
  v3: 手动重置 currentProgram=null / currentBlendMode=Infinity / currentScissor=null /
      currentFramebuffer=null + pipeline 纹理单元缓存置空
Phaser 渲染 2D UI（必须 render.clearBeforeRender:false，否则 preRender 会把 3D 全清）
```

- Phaser `preRender`（v3.90 源码证实）：`clearBeforeRender:true` 时 `gl.clear(COLOR|DEPTH|STENCIL)`；且总是 `gl.enable(SCISSOR_TEST)` + `gl.bindFramebuffer(null)`。
- 缩放：以 Phaser Scale Manager 为准，Three 用 `setSize(w,h,false)`（不 updateStyle）并禁用 Three 的 resize 逻辑。

## 社区成功案例

- **Phaser 官方示例：Three.js 立方体作为 Extern GameObject**（`game-objects/extern/view/threejs-cube`）。
- **Phaser 官方维护者 samme（2025-04）**：3D 地形 + Three 集成进 Phaser 循环，核心代码 `view.render = function(){ renderer.resetState(); renderer.render(scene,camera); }`；移除 Three 的 Clock/setAnimationLoop，改用 Phaser 帧循环 + `this.add.extern()`，用 `renderer.setViewport` 对齐尺寸。
- GitHub issue #4490「Mixing 2D and 3D using Phaser3 and Three.js」：问的就是 Phaser 3 缺 Pixi 那种 `renderer.reset()` 式公开 API，issue 关闭时无官方方案（历史痛点）。

来源：
- https://phaser.io/examples/v3.85.0/game-objects/extern/view/threejs-cube
- https://phaser.discourse.group/t/3d-terrain-with-three-js/15293
- https://github.com/phaserjs/phaser/issues/4490

## 替代方案评估

- **双 canvas 叠加**：H5 可行（互不干扰），但**微信/抖音小游戏不可行**——只有一个上屏 canvas，`createCanvas` 之后创建的都是离屏 canvas；离屏画 UI 再每帧 blit 到主 canvas = 全屏纹理拷贝，性能/清晰度损耗。**小游戏场景下共享 context 是唯一合理路径**。
- **Three 内置正交相机 UI 层（Sprite/CanvasTexture）**：只依赖 Three，无状态残留问题，包体小；但文本排版/布局/命中测试/滚动/补间全要自造（`@trkbt10/r3` 是「Phaser 风格 UI 框架建在 Three 正交 stage 上」，证明可行但小众）。UI 重时 Phaser 生产力/性能明显占优，值得付一次衔接成本。

来源：
- https://developers.weixin.qq.com/minigame/dev/api/render/canvas/wx.createCanvas.html
- https://github.com/trkbt10/r3

## 推荐实现策略（首期）

1. **单一 canvas + 自建 WebGL2 context**，属性定死：`antialias:true, depth:true, stencil:true, alpha:true, premultipliedAlpha 两侧一致, preserveDrawingBuffer:false`。
2. **注入**：`new THREE.WebGLRenderer({ canvas, context, antialias:true })`；`new Phaser.Game({ type: Phaser.WEBGL, canvas, context, render:{ transparent:true, clearBeforeRender:false, antialias:true } })`。
3. **渲染顺序**：Three resetState → Three render → `gl.disable(DEPTH_TEST)` → Phaser 状态恢复 → Phaser render。
4. **更稳路径（可选用）**：仿官方 Extern 模式——Phaser 驱动帧循环，Three 挂 `this.add.extern()` 进渲染管线（`view.render = () => { three.resetState(); three.render() }`），用 Extern renderOrder 控制 3D 先画、UI 后画，规避 Phaser 缓存过期。

## 需 spike 验证的风险点（按优先级）

1. **Phaser 3 注入 WebGL2 context 的完整可用性**：renderer 无 WebGL2 分支、WebGL1 扩展在 WebGL2 下返回 null —— 验证 MultiPipeline/VAO/instancing/FX/BitmapText 在 WebGL2 下全部正常（异常则锁定 Phaser 版本或上 v4）。
2. **Phaser 3 状态强制恢复的完整性**：手动重置那几个私有缓存字段是否足够，还是 pipeline 内部有更多遗漏（每帧衔接成败核心）。
3. **depth/stencil 残留**：Three 后 Phaser 前是否需 `disable(DEPTH_TEST)` + stencil 清理；确认 Phaser 默认 pipeline 不写 depth，避免 UI 被 3D 遮挡。
4. **小游戏真机差异**：微信/抖音小游戏 `getContext('webgl2')` 与 `antialias` 支持度、preserveDrawingBuffer，以及 Phaser 小游戏 adapter 对该「外部注入 context」路径是否兼容。
