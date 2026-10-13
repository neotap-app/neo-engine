# 架构

整体定位与技术选型见根 `AGENTS.md`；引擎需求与决策见 [/specs/features/neo-engine/README.md](/specs/features/neo-engine/README.md)。
编码约定见 [/specs/rules/sdk.md](/specs/rules/sdk.md) / [/specs/rules/tools.md](/specs/rules/tools.md)。

## 目录结构

```
packages/neo-engine/src/          # @neotap.app/neo-engine：客户端 SDK 运行时
  index.ts                        # SDK 公共入口（= sdk/index.ts）
  sdk/
    manifest/index.ts             # manifest 解析实体类 NeoManifest
    types/                        # NeoGameInstance / GameContext / GameMode
      game-context/               # RAL 能力接口 + CapabilityBundle + no-op 降级
    runtime/                      # createRuntime 外壳（加载包 / 编排引擎 / 生命周期）
    platforms/                    # 平台能力实现 + DOM shim
      h5/  minigame/  wechat/  douyin/

packages/neo-engine-tools/src/    # @neotap.app/neo-engine-tools：构建工具 + CLI（Node 侧）
  build/
    index.ts  types.ts  common.ts
    platforms/                    # 平台特定构建：h5 / wechat / douyin / minigame
  cli/                            # bin.ts  index.ts  build.ts  lint.ts

examples/phaser-demo/             # 示例游戏工程（原工程结构示范）
```

## 关键模式

| 领域 | 约定 |
| --- | --- |
| 编译管线 | 原工程 → 转译（vite）→ 编译/发布（平台官方工具）（见 [/specs/rules/tools.md](/specs/rules/tools.md)） |
| manifest | `package.neo.json`（4 字段）；构建器基于 entry 的 ES6 import 图自动分包/tree-shake |
| RAL | 能力接口 + 每平台实现 + no-op 降级（见 [/specs/rules/sdk.md](/specs/rules/sdk.md)） |
| 产物 | 平台无关 manifest + 每平台产物 |
| 引擎 | 2D = Phaser 3.90（锁定）、3D = Three.js；`GameMode` 二选一，互不混合渲染 |
