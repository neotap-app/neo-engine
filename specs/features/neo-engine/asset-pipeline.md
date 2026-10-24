# 资产管线（P1：manifest / key 校验 / 类型生成）

在原样镜像 `assets/**` 的 public 目录语义之上，构建器自动生成资产索引，并在 lint / build 阶段校验代码里写死的资产 key。

## 产物与生成位置

| 文件 | 位置 | 用途 |
| --- | --- | --- |
| `assets/**` | `<outDir>/assets/**` | 原样镜像，运行时按相对路径访问 |
| `assets-manifest.json` | `<outDir>/assets-manifest.json` | 产物内资产索引 |
| `assets-manifest.json` | `<cwd>/.neo/assets-manifest.json` | 与产物内一致的本地清单，便于人工核对 |
| `assets.d.ts` | `<cwd>/.neo/assets.d.ts` | 生成的 `NeoAssetKey` 联合类型 |

- `.neo/` 是构建产物目录，写入仓库根 `.gitignore`，不得覆盖 `assets/**` 原文件
- 所有 target（`h5` / `wechat` / `douyin`）构建完成后都会写 manifest 和类型文件

## manifest 结构

```json
{
  "version": 1,
  "assets": [
    {
      "key": "textures/plant.png",
      "size": 12345,
      "hash": "f084b1351c41cf3c554d932a3a978992a39b902f289c6e213b6428c3b38541ed"
    }
  ]
}
```

- `key`：相对 `assets/` 的 POSIX 路径，按字典序排序
- `size`：文件字节数
- `hash`：文件内容的完整 sha256 十六进制（64 位）
- 不写入时间戳等易变字段，相同输入产生稳定输出
- `assets/` 不存在时 `assets` 为空数组

## key 归一化

与 SDK 的 `assetPath` / `normalizeAssetKey` 保持一致，以下写法等价：

```ts
ctx.load.loadImage('textures/a.png');
ctx.load.loadImage('assets/textures/a.png');
ctx.load.loadImage('./assets/textures/a.png');
```

- 统一为相对 `assets/` 的 key 后与索引比对
- 空 key、`..` 穿越、绝对 URL/协议、`/` 或 `//` 开头的路径视为非法
- tools 通过 SDK 公共入口 `@neotap.app/neo-engine` 复用该归一化，不 import 内部子路径

## 校验匹配规则

- 遍历入口的本地 import 图（跳过 `node_modules` / `dist` / `out` / `.neo-build` / `.neo-dev` / `.neo`）
- 按 callee 名字匹配调用：`loadText`、`loadBinary`、`loadImage`、`resolve`、`load`
  - 覆盖属性访问（`ctx.load.loadImage(...)`）、独立函数/解构调用（`loadImage(...)`）与字符串下标访问（`load['loadImage'](...)`）
  - 仅校验第一个参数为普通字符串字面量的调用；变量、模板字符串等非字面量跳过，避免误报
  - 排除内建 `Promise.resolve(...)`，避免与资产 `resolve` 混淆
- 未知 key 输出 `file:line:col`，并列出可用 key；超过 10 个时截断为前 10 个与剩余数量
- `assets/` 缺失时索引为空集合，任何字面量资产调用都会报未知 key

## lint / build 行为

- `neo lint` / `lintProject`：资产 key 错误与其他静态约束错误一起返回，存在错误时 exit code 1
- `buildProject`：在开始任何 target 构建前执行同一校验；有错误直接抛错，不产出半成品
- 构建成功后再写产物 manifest 与 `.neo` 生成物

## 非目标（后续阶段）

hash 缓存、压缩、图集合并、预加载、加载进度等留给后续阶段；本次不改变游戏侧按路径 key 寻址的方式。
