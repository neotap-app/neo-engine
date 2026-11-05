# Spec 编写与管理规范

`/specs` 是本仓库的 spec 源头：所有需求、技术约定、模块与踩坑经验都在这里维护。
本文档规定 spec 的目录结构、编写方式与交叉引用规则。

## 目录结构

| 目录 | 内容 | 何时写入 |
| --- | --- | --- |
| `overview/` | 目录结构与跨领域关键模式 | 全局性架构 |
| `features/` | 引擎需求与技术实现，**每个模块一个文件夹**，内部放相关 md 与资料 | 引擎功能 |
| `rules/` | 编码约束与最高规则，按领域分文件（`sdk.md` / `tools.md` / 本文件） | 约束类内容 |
| `lessons-learned/` | 踩坑经验 | 踩坑 |

## 编写约定

- 语言：中文，简洁，一文件一主题
- **约束一律放 `rules/`**，按领域分文件；设计文档（`overview` / `features`）只记录技术设计与信息，不掺杂约束。涉及多处共用的约束收敛到统一位置，禁止散落重复
- 找不到对应 spec 时，随本次改动在对应领域目录补充，而不是跳过
- 改动代码时同步更新受影响的 spec，避免文档与代码脱节

## 交叉引用

- 所有 spec 之间的交叉引用使用**相对当前文件的路径**：如 `../rules/sdk.md`、`../features/neo-engine/README.md`
- **禁止使用以 `/` 开头的根路径**（如 `/specs/...`、`/packages/...`）：GitHub 会把它解析成站点根路径而 404
- 指向仓库内其他位置（packages / examples 源码、README）同样使用相对路径，如 `../../packages/neo-engine/README.md`

## 命名

- feature 模块：`specs/features/<module-name>/`，模块入口文档用 `README.md`，其余资料按内容命名
- rules 领域：`specs/rules/<domain>.md`（如 `sdk.md`、`tools.md`）
