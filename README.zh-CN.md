# Neo Engine

**轻量化跨平台 JS 游戏框架**

基于 **Phaser（2D）+ Three.js（3D）** 的**跨平台轻量化 JavaScript/TypeScript 游戏框架**。

[English](./README.md)

## 特性

- **一次编写，多端发布** — 一份代码即可构建发布为 **HTML5 游戏** / **独立客户端游戏**（Android / iOS / 桌面平台等）/ **NeoTap 小游戏** / **微信小游戏** / **抖音小游戏**。
- **多平台运行时 SDK** — 封装跨平台运行时，提供**本地存档存储**、**广告变现**、**资源加载优化**、**设备信息**、**社交分享**等丰富能力，助力游戏快速上线。

## 包结构

| 包 | 说明 |
| --- | --- |
| `@getneotap/neo-engine` | 客户端运行时 SDK（manifest、平台能力、`createRuntime`） |
| `@getneotap/neo-engine-tools` | 构建工具 + `neo` CLI（无头构建接口 `buildProject`） |

## 仓库

pnpm workspace monorepo：`packages/*` 为框架，`examples/*` 为示例游戏。架构、决策与约定见 `AGENTS.md` 与 `specs/`。
