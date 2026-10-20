# Neo Engine

## 项目概述

Neo Engine 是**平台无关**的 JS 多平台编译游戏引擎，基于 Phaser（2D）+ Three.js（3D）。
一份原工程（manifest + 类型化脚本 + 资产）经编译管线产出多平台产物：H5 / 微信小游戏 / 抖音小游戏，后续扩展 Capacitor 移动端等。

引擎被宿主平台（如 NeoTap）用于 AI 创作与运行小游戏；**宿主平台集成不在本仓库范围**，本仓库只维护平台无关的引擎 SDK 与构建工具。

## 开发概述（架构）

pnpm workspace monorepo：

| 部件 | 说明 |
| --- | --- |
| `/packages/neo-engine` | 客户端 SDK 运行时（`@neotap.app/neo-engine`）：manifest 解析、RAL 平台能力、`createRuntime` 外壳、平台实现（`h5` / `minigame` / `wechat` / `douyin`）。**纯客户端，无 node 依赖** |
| `/packages/neo-engine-tools` | 构建工具 + CLI（`@neotap.app/neo-engine-tools`，`bin: neo`）：`build/`（无头构建接口 `buildProject`）+ `cli/`。Node 侧，依赖 SDK |
| `/examples/phaser-demo` | 示例游戏工程（原工程结构示范） |
| `/specs` | 需求、技术文档与约定（spec 源头） |

技术栈要点：TypeScript（tsup 构建 ESM+CJS）、vite（转译，锁定 CommonJS+ES5）、平台官方工具（编译/发布）、Phaser 3.90（锁定版本）/ Three.js。

## 工作流程（specs-first）

1. 用户提出需求
2. **动手前先到 `/specs` 查对应 spec**：引擎需求与技术实现见 `/specs/features`，跨领域设计见 `/specs/overview`，编码规范见 `/specs/rules/sdk.md` / `/specs/rules/tools.md`，踩坑见 `/specs/lessons-learned`。找到则先读取并按 spec 约定实施；找不到则随本次改动在 `/specs` 对应目录补充
3. 查询第三方库相关定义/文档
4. 给出初步修改方案，经用户确认后再动手

## 规范入口（按需渐进阅读）

- `/specs/overview/architecture.md` — 目录结构与关键模式
- `/specs/rules/sdk.md` — SDK 客户端运行时编码规范与约束
- `/specs/rules/tools.md` — 构建工具 + CLI 编码规范与约束
- `/specs/rules/worktree.md` — git worktree 并行开发与审阅规范
- `/specs/rules/spec-write-and-manage.md` — spec 编写与管理规范
- `/specs/features/neo-engine/README.md` — 引擎需求、决策与目录结构
- `/specs/lessons-learned/` — 踩坑经验
