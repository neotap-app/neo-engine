# Neo Engine

**轻量化跨平台 JS 游戏框架**

A lightweight, cross-platform **JavaScript / TypeScript game framework** built on **Phaser (2D) + Three.js (3D)**.

[中文文档](./README.zh-CN.md)

## Features

- **Write once, ship everywhere** — a single codebase builds and publishes to **HTML5 games**, **standalone client games** (Android / iOS / desktop, etc.), **NeoTap mini games**, **WeChat mini games**, and **Douyin mini games**.
- **Multi-platform runtime SDK** — a unified cross-platform runtime provides rich capabilities such as **local save storage**, **ad monetization**, **optimized asset loading**, **device info**, and **social sharing**, helping you launch fast.

## Packages

| Package | Description |
| --- | --- |
| `@neotap.app/neo-engine` | Client runtime SDK (manifest, platform capabilities, `createRuntime`) |
| `@neotap.app/neo-engine-tools` | Build tools + `neo` CLI (headless `buildProject` API) |

## Repository

pnpm workspace monorepo: `packages/*` for the framework, `examples/*` for sample games. See `AGENTS.md` and `specs/` for architecture, decisions, and conventions.
