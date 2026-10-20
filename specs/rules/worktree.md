# Git Worktree 并行开发规范

用于把互不依赖的修复/功能拆到独立 worktree 并行开发，避免相互污染主工作区。

## 位置与命名

- worktree 统一放在仓库外的 `D:\Projects\aeilab\bluehouse\neo-engine-worktrees\<slug>`；**禁止放在仓库目录内**。
- 一个独立问题对应一个 worktree，目录名用短 slug，例如 `p0-1-ral-input-lifecycle`。
- 分支名与目录名一致，前缀按变更类型取 `fix/`、`feat/`、`docs/`，例如 `fix/p0-1-ral-input-lifecycle`。
- 默认从 `main` 创建；需要基于其他分支时必须在任务说明里写明基线。

## 创建与初始化

```powershell
git worktree add "D:\Projects\aeilab\bluehouse\neo-engine-worktrees\<slug>" -b "<branch>" main
```

- 新 worktree 没有 `node_modules`，进入该目录执行 `pnpm install`；安装完成后再跑类型检查/构建。
- 同一个 worktree 只处理一个主题，不夹带无关重构、格式化或依赖升级。
- 不在 worktree 内再创建 worktree。

## 提交与审阅

- 每个 worktree 的改动收敛为一个聚焦 commit；提交信息遵循仓库既有风格（`fix(scope): ...` / `feat(scope): ...` / `docs(scope): ...`）。
- commit 前必须至少执行与改动相关的 `pnpm type-check` 和构建/验证命令，并在交付说明中写明命令与结果。
- 审阅方式：`git diff main...<branch>`；审阅通过后可合并或 cherry-pick。
- 未明确要求时，不合并、不推送、不删除分支。

## 清理

```powershell
git worktree remove "D:\Projects\aeilab\bluehouse\neo-engine-worktrees\<slug>"
```

- 删除 worktree 前确认其中没有未提交改动；需要保留的改动先提交或导出 patch。
- 清理后用 `git worktree list` 确认没有残留。

## 并行约定

- 并行 agent 上限 2 个；每个 agent 独占一个 worktree，禁止跨 worktree 修改文件。
- 给 agent 的任务说明必须包含：worktree 绝对路径、分支名、基线、改动范围、验收命令、禁止事项（不提交未授权内容、不改无关文件、不合并）。
- 两个并行任务若会修改同一文件，应在任务说明中划分职责，或改为串行执行。
- 每个 agent 交付时回报：变更文件、验证命令与结果、遗留问题/风险。

## 与 specs 的关系

- 修复改变行为或约定时，同步更新对应 spec（见 `/specs/rules/spec-write-and-manage.md`）。
- 本规范本身变更不需要派生子 worktree，直接在 `main` 提交 `docs(specs): ...`。
