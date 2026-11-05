# 资产管线（public 目录语义）

工程 `assets/**` 按 Next.js `public/` 的方式处理：构建时自动打包、保持目录结构，运行时直接按路径使用。

## 产物

| 文件 | 位置 | 用途 |
| --- | --- | --- |
| `assets/**` | `<outDir>/assets/**` | 原样镜像，运行时按路径访问 |

- 所有 target（`h5` / `wechat` / `douyin`）共用 `src/build/assets.ts` 的 `copyAssets`
- **不生成** `assets-manifest.json`、`.neo/assets.d.ts`，不做资产 key 声明或构建期校验
- 新增资产只需放进 `assets/`，无需改 manifest 或任何清单
- `assets/` 不存在时跳过复制

## 寻址

`IResource.resolveAsset(key)` 是统一 resolver，游戏代码与 Three.js 等外部加载器共用同一套寻址：

```ts
ctx.load.resolveAsset('/textures/plant.png'); // H5: <base>assets/textures/plant.png
                                             // 小游戏: assets/textures/plant.png
```

以下写法等价：

```ts
ctx.load.resolveAsset('/textures/plant.png');
ctx.load.resolveAsset('textures/plant.png');
ctx.load.resolveAsset('assets/textures/plant.png');
ctx.load.resolveAsset('./assets/textures/plant.png');
```

- 统一归一化为 `assets/<相对路径>`
- 空 key、`..` 穿越、绝对 URL/协议、`//` 开头视为非法，返回 `null`
- H5 在归一化结果前拼接 `baseUrl`（构建/dev 注入 `import.meta.env.BASE_URL` / `'./'`）
- 小游戏返回包内相对路径，供 `readFileSync` / `createImage` 直接使用

## 外部组件（Three.js 等）

```ts
const manager = new THREE.LoadingManager();
manager.setURLModifier((url) => ctx.load.resolveAsset(url) ?? url);
```

`IResource` 的 `load` / `loadText` / `loadBinary` / `loadImage` 与 `resolveAsset` 使用同一套 key 规则；`resolve(key)` 保留结构化来源（`remote` / `local`）供音频等能力复用。

## 非目标（后续阶段）

hash 缓存、压缩、图集合并、预加载、加载进度等留给后续阶段；本次不引入资产清单。
