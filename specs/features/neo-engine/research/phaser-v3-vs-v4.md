# 调研：Phaser 3 vs Phaser 4 技术选型

> 调研日期 2026-10-05。用于引擎选型最终拍板。**结论：选 Phaser 3.90 起步，Phaser 4 作技术跟踪项 + spike 闸门。**

## 决策背景

引擎基于 Phaser（2D）+ Three.js（3D），AI 生成小游戏，编译目标 H5 / 微信小游戏 / 抖音小游戏。早期决策「3D 游戏 2D UI 用 Phaser 混合渲染（共享 context）」经本调研后**被推翻**（见结论）。

## 结论速览

| 维度 | Phaser 3.90 | Phaser 4.2 |
| --- | --- | --- |
| 混合渲染状态恢复 | ✗ 私有字段 hack | ✓ 官方 Extern + `glWrapper.update(undefined,true)` |
| 微信/抖音小游戏适配 | ✓ 验证过的社区路径 | ✗ 完全空白，从零自研 |
| AI 生成代码 | ✓ 模型语料压倒性偏 v3 | △ 需主动喂官方 28 个 skills |
| 生态（插件/教程/示例） | ✓ 十年积累 | ✗ 约 6 个月 |
| 稳定性 | ✓ 3.90 长期维护 | △ 4.2.1 仍高频修 bug |
| TS 类型 / ESM | ✓ | ✓（官方 d.ts + ESM，v4.1 修默认导出） |
| 新特性（滤镜/GPU/光照） | △ 够用但受限 | ✓ 明显领先 |

## 关键事实

### Phaser 4 渲染器
- RenderNode 架构替代 v3 Pipeline；**WebGL 状态全托管 + context restoration 内置**；Canvas 渲染器废弃。
- 默认 WebGL1 API 面 + 可注入 WebGL2 context；「百万精灵单 draw call」来自 SpriteGPULayer（GPU 实例化）。
- 移除了 Mesh/Plane（3D 定位不在此，与我们「3D 交给 Three」一致）。
- 迁移指南 22 节破坏性变化，高频 API 差异：Pipeline→RenderNode、Tint 系统重写、`Geom.Point`→`Vector2`、`Math.TAU` 改义、`setTintFill` 删除、纹理坐标 Y 轴翻转、Camera 矩阵重写等——**主流模型的 Phaser 知识几乎全来自 v3 语料，裸生成 v4 代码错误率高**。
- 官方对策：仓库自带 28 个 skills + v3→v4 迁移 skill（`github.com/phaserjs/phaser/tree/master/skills`），付费托管 Phaser Game Agent（私有引擎非 OSS v4）。

来源：
- https://github.com/phaserjs/phaser/releases/tag/v4.0.0
- https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md
- https://github.com/phaserjs/phaser/blob/v4.2.1/src/renderer/webgl/WebGLRenderer.js

### 混合渲染状态恢复（原 Q2 核心难点）
- **Phaser 3**：无统一恢复 API。状态散落 `currentFramebuffer/currentProgram/currentBlendMode/currentScissor*` 等实例字段；`setBlendMode(force)` 只管 blend；Extern 的 `pipelines.rebind()` 不恢复全局状态。要完整恢复需 hack 私有字段，且每个 v3 小版本可能破坏。
- **Phaser 4**：`WebGLGlobalWrapper`（`renderer.glWrapper`）已发布在 4.x 稳定版；`glWrapper.update(undefined, true)` 强制重放全部状态（VAO/bindings/blend/clear/cull/depth/scissor/stencil/texturing/viewport）；Extern 内置 YieldContext/RebindContext 自动恢复。`GameConfig.canvas/context/customEnvironment` 均在 v4 存在。
- **但小游戏侧 Phaser 4 为零适配**：DOM shim 从零自研 + `ANGLE_instanced_arrays`/`OES_vertex_array_object` 扩展在微信/抖音 WebGL 上的兼容风险 + Canvas 降级被废。

来源：
- https://github.com/phaserjs/phaser/blob/v4.2.1/src/renderer/webgl/wrappers/WebGLGlobalWrapper.js
- https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/extern/ExternWebGLRenderer.js
- https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/extern/Extern.js

### 小游戏适配
- 微信：Phaser 官方无适配（issue #4438 关闭，非官方支持）。Phaser 3 社区路径 = `customEnvironment:true` + weapp-adapter（finscn/weapp-adapter 等），有上线先例；Phaser 4 零案例。
- 抖音：官方 `minigame-engine-adapter/phaser` 文档页存在（SPA 正文无法抓取），tt-adapter 历史定位是 Phaser 3 一代引擎 shim；`github.com/bytedance/tt-adapter` 已 404。Phaser 4 无任何抖音适配。

来源：
- https://github.com/phaserjs/phaser/issues/4438
- https://github.com/finscn/weapp-adapter
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/minigame-engine-adapter/phaser

## 选型结论

**以 Phaser 3.90 为平台基础，Phaser 4 作技术跟踪 + spike 闸门。** 理由（按硬约束排序）：
1. 小游戏无 DOM 是硬发布要求，Phaser 3 有验证过的社区适配与上线先例，Phaser 4 该维度为零且附 WebGL 扩展/Canvas 废弃两层风险——**否决性**。
2. AI 生成代码对 v3 开箱即对，v4 需强制加载官方 skills，生成链路可靠性优先。
3. 混合渲染的 hack 是**可隔离技术债**；但既然要付出 hack 成本，不如直接**推翻混合渲染决策**，改用 Three 内置正交 UI 层，两引擎解耦。

**最终决策（用户拍板）**：3D 游戏的 2D UI 走 **Three 内置正交相机 UI 层**，不做 Phaser+Three 混合渲染；Phaser 3.90 只服务纯 2D 游戏。Phaser 4 技术跟踪：spike = ①微信/抖音开发者工具跑通最小 Phaser 4 场景 ②验证 Extern+Three 官方流程，通过后再评估迁移。

## 未来若迁 Phaser 4 的迁移成本

20 类 API 差异（Pipeline→RenderNode、Tint、Point→Vector2、TAU、纹理 Y 翻转等），可用官方 v3→v4 迁移 skill 辅助；届时 AI 侧需同步切换 skills。

## 验证边界（如实声明）

- 抖音 `minigame-engine-adapter/phaser` 正文（SPA）无法抓取，tt-adapter 面向版本按历史定位推断。
- 微信官方适配器文档当前 URL 404，微信侧结论由 GitHub 一级来源支撑。
- Phaser 4 `types/phaser.d.ts` 超 5MB 未直接抓取，glWrapper 公开性以源码 JSDoc + 迁移指南为准。
