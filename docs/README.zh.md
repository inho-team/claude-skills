# QE Framework 文档导航

QE Framework 是同时面向 Claude Code 和 Codex 的规范驱动任务执行框架。

基础流程:

```text
/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task
```

本文档是中文入口页。更详细的内容已经按主题拆分到独立文档中。

## 建议先读

- 项目概览: [../README.md](../README.md)
- 哲学与设计意图: [PHILOSOPHY.md](PHILOSOPHY.md)
- 详细使用方法: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- 文档地图: [DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md)
- 多模型配置: [MULTI_MODEL_SETUP.md](MULTI_MODEL_SETUP.md)
- 系统总览: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)

## 核心概念

- `single-model`
  - 只使用 Claude 的默认路径
  - `/Qatomic-run` 使用 Haiku swarm 方式执行 atomic tasks
- `hybrid`
  - 只有部分角色使用外部 runner
- `multi-model`
  - planner / implementer / reviewer / supervisor 按角色显式分离

## 按订阅组合的推荐方式

| 可用工具 | 推荐模式 | 推荐默认映射 |
|----------|----------|--------------|
| 仅 Claude | `single-model` | Claude 负责全部角色 |
| Claude + Codex | `hybrid` | implementer = Codex，其余 = Claude |
| Claude + Gemini | `hybrid` | reviewer = Gemini，其余 = Claude |
| Claude + Codex + Gemini | `multi-model` | planner/supervisor = Claude，implementer = Codex，reviewer = Gemini |

## 快速开始

1. 安装插件

```bash
claude plugin marketplace add inho-team/qe-framework
claude plugin install qe-framework@inho-team-qe-framework
```

2. 初始化项目

```text
/Qinit
```

3. 启动工作流

```text
/Qplan
/Qgs
/Qatomic-run
/Qcode-run-task
```

## 说明

- 如果 Codex 或 Gemini 因 quota 限制暂时不可用，可以使用 `--role-override` 做一次性重分配。
- 这个 override 只影响当前运行，不会修改 `team-config.json`。
