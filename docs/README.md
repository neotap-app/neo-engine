# API 文档

本文档对应本仓库当前代码，按领域拆分。建议先读 [Get Started](./get-started.md)，再按需查阅。

## 包与入口

- [包与导出](./packages.md)
- [游戏实例](./game/instance.md)
- [游戏上下文](./game/context.md)

## Runtime

- [createRuntime](./runtime/create-runtime.md)
- [RuntimeOptions](./runtime/options.md)
- [mount 流程](./runtime/mount.md)
- [unmount 流程](./runtime/unmount.md)
- [跨端基础类型](./runtime/types.md)

## Manifest

- [NeoManifest](./manifest.md)

## 平台能力（RAL）

- [能力总览](./capabilities/README.md)
- [IStorage](./capabilities/storage.md)
- [IAudio](./capabilities/audio.md)
- [IInput](./capabilities/input.md)
- [ILifecycle](./capabilities/lifecycle.md)
- [IResource](./capabilities/resource.md)
- [ISystem](./capabilities/system.md)
- [IScreen](./capabilities/screen.md)
- [no-op 降级](./capabilities/noop.md)

## 平台能力工厂

- [平台工厂总览](./platforms/README.md)
- [H5](./platforms/h5.md)
- [小游戏通用](./platforms/minigame/README.md)
  - [MinigameAPI](./platforms/minigame/api.md)
  - [小游戏能力](./platforms/minigame/capabilities.md)
  - [Runtime 环境](./platforms/minigame/runtime-environment.md)
  - [DOM shim Adapter](./platforms/minigame/adapter.md)
- [微信](./platforms/wechat.md)
- [抖音](./platforms/douyin.md)
- [能力支持矩阵](./platforms/matrix.md)

## 资源

- [资源 key](./assets/keys.md)

## 构建工具与 CLI

- [工具总览](./tools/README.md)
- [buildProject](./tools/build.md)
- [资产拷贝](./tools/build-assets.md)
- [CLI 命令](./tools/cli.md)
- [lint](./tools/lint.md)
- [dev server](./tools/dev-server.md)
- [preview server](./tools/preview-server.md)

## 错误与边界

- [错误边界](./errors.md)
