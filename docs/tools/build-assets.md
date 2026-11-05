# 资产拷贝

```ts
function copyAssets(cwd: string, outAbs: string): void;
```

- `copyAssets`：把 `<cwd>/assets` 递归复制到 `<outAbs>/assets`，保持目录结构；目录不存在时跳过。
- 资产按 public 目录语义自动打包，**不生成清单**，也不做构建期 key 校验。
- 运行时通过 `IResource.resolveAsset` 按路径寻址，`/logo.png` 等价于 `assets/logo.png`，见 [资源 key](../assets/keys.md)。

H5 与小游戏产物结构见 [buildProject](./build.md)。
