# 资产工具

```ts
interface AssetEntry {
  key: string;
  size: number;
  hash: string;
}

interface AssetManifest {
  version: 1;
  assets: AssetEntry[];
}

const ASSET_MANIFEST_FILE = 'assets-manifest.json';
const NEO_DIR = '.neo';

function collectAssets(cwd: string): AssetEntry[];
function writeAssetManifest(cwd: string, outAbs: string): AssetManifest;
function writeAssetTypes(cwd: string): AssetManifest;
function copyAssets(cwd: string, outAbs: string): void;
function validateProjectAssetKeys(cwd: string, entryPath: string): string[];
```

- `collectAssets`：扫描 `<cwd>/assets`，按 key 字典序返回；目录不存在返回空数组。
- `writeAssetManifest`：把 manifest 写到 `outAbs`。
- `writeAssetTypes`：写 `.neo/assets-manifest.json` 与 `.neo/assets.d.ts`。
- `copyAssets`：把 `<cwd>/assets` 递归复制到 `<outAbs>/assets`。
- `validateProjectAssetKeys`：返回 `file:line:col` 形式的错误列表，空数组表示通过。

产物结构见 [资产产物与 manifest](../assets/manifest.md)。
