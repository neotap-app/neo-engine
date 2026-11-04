# 资产产物与 manifest

所有 target 构建完成后生成：

| 文件 | 位置 | 说明 |
| --- | --- | --- |
| `assets/**` | `<outDir>/assets/**` | 原样镜像 |
| `assets-manifest.json` | `<outDir>/assets-manifest.json` | 产物资产索引 |
| `assets-manifest.json` | `<cwd>/.neo/assets-manifest.json` | 本地副本 |
| `assets.d.ts` | `<cwd>/.neo/assets.d.ts` | `NeoAssetKey` 联合类型 |

manifest 结构：

```json
{
  "version": 1,
  "assets": [
    {
      "key": "textures/logo.png",
      "size": 12345,
      "hash": "f084b1351c41cf3c554d932a3a978992a39b902f289c6e213b6428c3b38541ed"
    }
  ]
}
```

- `key`：相对 `assets/` 的 POSIX 路径，按字典序排序；
- `size`：字节数；
- `hash`：完整 sha256 十六进制；
- `assets/` 不存在时 `assets` 为空数组。

`.neo/` 属于构建产物，不入库；不得覆盖 `assets/**` 原文件。

相关工具见 [资产工具](../tools/build-assets.md)。
