# npm 发布（CI/CD）

## 目标

把 `@neotap.app/neo-engine` 与 `@neotap.app/neo-engine-tools` 打包发布到 npm。当前阶段只做 npm 发布，不做平台产物（H5 / 微信 / 抖音）的自动构建与上传。

## 决策

- **仅 GitHub Actions**：工作流 `.github/workflows/publish-npm.yml`，不引入第三方发布服务。
- **tag 触发 + 手动兜底**：推送 `v*` tag 时校验两个包的 `version` 与 tag 一致；`workflow_dispatch` 发布当前版本。
- **版本手工维护**：不引入 changesets，发版时同时修改两个包的 `version` 并打同名 tag。
- **NPM_TOKEN + provenance**：使用 granular access token（secret `NPM_TOKEN`），通过 `NPM_CONFIG_PROVENANCE=true` 启用 provenance（pnpm 不识别 `--provenance`；需要 `id-token: write`，且源码仓库公开可访问）。
- **发布顺序**：先 `neo-engine`，后 `neo-engine-tools`（后者依赖前者）。
- **幂等**：发布前用 `npm view <pkg>@<version>` 检查，已存在的版本跳过，允许失败后重跑。

## 流程

1. 修改两个包的 `version`，提交。
2. 打 tag `v<version>` 并推送。
3. Actions 安装依赖 → 校验 tag → `pnpm type-check` → `pnpm build` → 逐包发布。

## 约束

- 发布产物只包含 `dist`（`files` 字段）。
- `neo-engine-tools` 的 `workspace:*` 依赖由 pnpm 在发布时改写为实际版本。
- 不发布 workspace 根 `neo-engine-monorepo`（`private: true`）。
