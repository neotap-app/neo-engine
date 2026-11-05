# 资源 key

```ts
const ASSET_DIR = 'assets';

function normalizeAssetKey(key: string): string;
function assetPath(key: string): string | null;
function joinAssetUrl(baseUrl: string, path: string): string;

interface IResource {
  resolveAsset(key: string): string | null;
}
```

## key 规则

逻辑 key = 相对工程 `assets/` 的路径。以下写法等价：

```ts
ctx.load.loadImage('/textures/logo.png');
ctx.load.loadImage('textures/logo.png');
ctx.load.loadImage('assets/textures/logo.png');
ctx.load.loadImage('./assets/textures/logo.png');
```

`/textures/logo.png` 会解析为实际路径 `assets/textures/logo.png`（H5 再拼 `baseUrl`）。

以下视为非法（`assetPath` 返回 `null`，加载器报 `invalid resource key`）：

- 空 key；
- 绝对 URL 或带协议前缀，如 `https://...`、`data:...`；
- `//` 开头；
- 含 `.` / `..` 路径段或空段（如 `a//b`）。

## 函数语义

| 函数 | 说明 |
| --- | --- |
| `normalizeAssetKey(key)` | 去空白、反斜杠转 `/`、去 `./` / `/` / `assets/` 前缀，返回相对 key |
| `assetPath(key)` | 校验并返回 `assets/<key>`；非法返回 `null` |
| `joinAssetUrl(baseUrl, path)` | 拼接 URL；`path` 是绝对 URL 或 `//` 开头时原样返回；`baseUrl` 为空时直接返回 `path` |
| `IResource.resolveAsset(key)` | 统一 resolver：H5 返回带 `baseUrl` 的 URL，小游戏返回包内相对路径；非法返回 `null` |

外部组件（如 Three.js）可复用同一 resolver：

```ts
const manager = new THREE.LoadingManager();
manager.setURLModifier((url) => ctx.load.resolveAsset(url) ?? url);
```

资产目录自动打包，无需声明；详见 [资产管线](../tools/build-assets.md)。
