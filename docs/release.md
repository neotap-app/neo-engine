# npm 发布

CI/CD 通过 GitHub Actions 将两个包发布到 npm：

- `@neotap.app/neo-engine`
- `@neotap.app/neo-engine-tools`

工作流文件：`.github/workflows/publish-npm.yml`

## 触发方式

### 推送 tag（推荐）

两个包的 `version` 必须与 tag 去掉 `v` 前缀后的值一致：

```bash
# 先修改 packages/neo-engine/package.json 与 packages/neo-engine-tools/package.json 的 version
git add packages/neo-engine/package.json packages/neo-engine-tools/package.json
git commit -m "chore(release): v0.2.0"
git tag v0.2.0
git push origin main --tags
```

工作流会依次执行：

1. `pnpm install --frozen-lockfile`
2. 校验 tag 与两个包的 `version` 一致
3. `pnpm type-check` + `pnpm build`
4. 按依赖顺序发布（先 `neo-engine`，再 `neo-engine-tools`）

### 手动触发

在 GitHub Actions 页面选择 **Publish to npm** → **Run workflow**，发布当前分支 `package.json` 中的版本。手动触发不校验 tag。

已存在于 npm 的版本会自动跳过，因此部分发布失败后可直接重跑。

## 仓库配置

- 在仓库 Secrets 中配置 `NPM_TOKEN`：npm granular access token，至少拥有两个包所在 scope 的读写权限。
- 工作流声明 `id-token: write` 并传入 `--provenance`，发布产物带 npm provenance（来源证明）。
- npm provenance 要求源码仓库公开可访问；仓库为私有或需要关闭时，移除工作流中的 `--provenance`。

## 发布前检查

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm build
```

`pnpm build` 产物位于各包的 `dist/`，`files` 字段只发布 `dist` 与 `package.json`。
