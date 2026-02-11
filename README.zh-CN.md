<p align="center">
  <img src="./assets/logo.svg" width="240" alt="Axon Logo">
</p>

# Axon

> 🧠 AI 驱动的开发操作系统

[English](./README.md) | [文档](./docs) | [贡献指南](./CONTRIBUTING.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Bun](https://img.shields.io/badge/bun-%3E=1.1.0-blue.svg)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org)

Axon 是一个统一的 AI 辅助开发环境，解决 AI 编程中的上下文丢失、重复造轮子和规划失控问题。**由 [OpenCode](https://github.com/anomalyco/opencode) 和 [OhMyOpenCode](https://github.com/code-yeongyu/oh-my-opencode) 驱动**，Axon 通过规格驱动开发和任务管理来编排这些强大的工具。

## ✨ 为什么选择 Axon?

**Axon 将 AI 从“代码补全工具”转变为真正的“开发合作伙伴”。**

- **🧠 规格优先**: 拒绝随意对话。在 `spec.md` 中定义需求，让 AI 保持专注。
- **🗺️ 珠子规划**: 将复杂功能拆解为原子的、按依赖排序的任务 (Beads)。
- **🔄 全程自动化**: 使用 `ax flow run` 一键开启从需求、规划、执行到验证的全生命周期编排。
- **🔌 IDE 原生集成**: 通过 **MCP** (Model Context Protocol) 协议无缝接入 Cursor/Trae/VSCode 等 IDE。
- **🤖 代理执行**: **OpenCode** 智能体逐个执行任务，确保上下文完整和代码质量。
- **🛡️ 质量守卫**: 自动运行 `run_checks` 并生成 `VERIFY.md` 验证报告，确保每个里程碑可交付。
- **♻️ 技能复用**: 自动应用团队库中经过验证的模式 (如“安全认证”)。
- **📚 文档集成**: 导入 PDF/Word/MD 文档作为 AI 上下文，使用 `ax docs` 辅助生成规格和代码。
- **🚀 技能编排**: 自动检测技术栈（React, Go, PHP）并建议相关的专家技能。
- **🛡️ 企业级安全**: 路径沙盒隔离、Git 安全检查以及通过 **OMO** 实现的多模型故障转移。

## 🎯 适用场景

Axon 最适合以下场景：

- **复杂功能实现**: 当功能需要修改多个文件并保持架构一致性时（例如“添加 JWT 认证”）。
- **绿地项目**: 启动一个需求清晰且严格遵循规格的新项目。
- **大规模重构**: 在代码库中系统地更新代码模式。
- **团队标准化**: 使用共享的技能模板在团队中强制执行一致的编码标准和能力。

它 **不适用于**：
- 简单的单行代码补全（请使用 Copilot/Cursor）。
- 实时语法错误修复（请使用 IDE linter）。

## 🆚 工具对比

注：不同产品版本与配置差异很大，下表对比的是常见默认用法与侧重点。

同时请注意抽象层级：
- **Axon** 是工作流/编排层（规格、任务图、执行、验证）。
- **OpenCode** 是底层的 agent 执行引擎。
- **OhMyOpenCode（OMO）** 是连接不同 LLM 后端/账号的 provider 层。

| 特性 | Axon | GitHub Copilot / Cursor | Aider / OpenDevin |
| :--- | :--- | :--- | :--- |
| **核心理念** | **Spec/Plan/Work/Verify**（流程优先） | **IDE 助手**（对话 + 补全） | **Agent 驱动编码**（对话 + patch/工具） |
| **上下文感知** | **可落盘产物**（`.openspec` + `.beads`） | **工作区上下文**（打开文件 + 索引/RAG，因配置而异） | **仓库上下文**（repo map/工具，因实现而异） |
| **规划能力** | ✅ **显式任务图**（Beads） | ⚠️ **临时/对话式**（默认无共享任务图） | ⚠️ **依赖工具**（可按计划执行；部分具备规划） |
| **人类控制** | ✅ **高**（可审阅文档/任务图 + Git 安全） | ✅ **高**（接受/拒绝 + 手动编辑） | ⚠️ **取决于模式**（基于 Git 的 review；自治可选） |
| **成本控制** | ✅ **用量追踪**（配置到位/供应商支持时可设限） | ⚠️ **订阅/供应商配额**（因方案而异） | ⚠️ **依赖供应商**（需显式 guardrails） |
| **知识复用** | ✅ **Skills 模板**（`.skills`） | ⚠️ **规则/提示词**（用户/工作区；结构化程度较低） | ⚠️ **提示词/脚本**（可复用；依赖工具） |

## 🚀 快速开始

### 首次 LLM 配置（推荐）

Axon 可以按你的工作方式运行在不同的 LLM 模式下：
- **IDE 托管 LLM**：运行 `ax mcp --llm off`，由 Cursor/Trae 负责模型调用（Axon 专注于 spec/plan/verify 等可落盘产物）。
- **OMO + OpenCode CLI**：安装/配置 OMO 后先运行 `ax config test`，并可用 `ax config set-model <model> -p <provider>` 将项目默认值写入 `.axon/config.yaml`。
- **回退模式（环境变量）**：设置 `ANTHROPIC_API_KEY`（或 `OPENAI_API_KEY` / `GOOGLE_API_KEY`），再运行 `ax config test --mode fallback`。

### 全局安装（推荐）

```bash
# 通过 npm 全局安装
npm install -g @arrislink/axon

# 或使用 bunx
bunx @arrislink/axon init my-project
```

### 开发安装

```bash
# 克隆仓库
git clone https://github.com/arrislink/axon.git
cd axon

# 安装依赖
bun install

# 本地链接以进行全局访问
npm link

# 验证安装
ax --help
```

### 初始化你的第一个项目

```bash
# 创建新项目
ax init my-awesome-project
cd my-awesome-project

# 交互式创建规格（或从文档创建）
ax docs add-dir ./docs          # 扫描并导入所有文档
ax spec init                    # AI 使用导入的文档生成规格
ax spec analyze                 # 将规格优化为专业 PRD.md

# 从规格生成任务图
ax plan
...
...
# 查看项目状态
ax status
```

## ✅ 最佳实践
- **Git 安全优先**：尽量在特性分支上运行，保持工作区干净，避免在保护分支（`main`/`master`）上直接执行。
- **优先走完整闭环**：需要“规格 → 规划 → 执行 → 验证”确定性流水线时，使用 `ax flow run`。
- **提交单一真理来源**：将 `.openspec/` 与 `.beads/` 纳入版本管理，让团队/CI 共享同一份规格与任务图。
- **把技能当依赖管理**：显式安装/更新 skills，保证规划与执行可复现。

### 范例 1：新项目（CLI / CI）

```bash
ax init my-project
cd my-project

# 一键端到端工作流
ax flow run \
  --work all \
  --skills suggest \
  --description "构建一个内部管理后台" \
  --project-type "web" \
  --tech-stack "auto" \
  --features "auth,rbac,audit-log" \
  --requirements "包含单元测试与类型检查"

# 查看产物与进度
ax status
```

### 范例 2：在已有仓库中引入 Axon

```bash
cd existing-repo
ax init .

# 可选：导入 docs 提升规格质量
ax docs add-dir ./docs

# 生成规划并逐个执行任务
ax plan
ax work
```

### 范例 3：IDE 工作流（Cursor / Trae / VSCode）

```bash
# 获取针对你当前 IDE 的 MCP 配置指南
ax mcp info

# 手动运行 MCP 服务 (通常由 IDE 自动唤起)
ax mcp run --llm off
```

详细配置步骤见：[GUIDE.zh-CN.md](./docs/GUIDE.zh-CN.md#️-ide-深度集成-mcp)。

### 故障排查：提示“没有可执行的任务”

```bash
ax status --beads

# 重新执行失败任务
ax work --bead <bead-id>

# 若依赖关系不合理，从 spec 重新生成任务图
ax plan
```

## 📚 核心概念

### 工作流

```mermaid
graph LR
    A[规格定义] --> B[任务规划]
    B --> C[技能匹配]
    C --> D[AI 执行]
    D --> E[成本追踪]
    E --> F[进度审阅]
```

### 目录结构

```
.axon/
├── config.yaml          # 项目配置
└── logs/               # 执行日志

.openspec/
└── spec.md             # 项目规格

.beads/
└── graph.json          # 任务依赖图

.skills/
└── *.md                # 项目特定技能（默认；可配置）
```

## 🛠️ 命令

| 命令 | 描述 |
|------|------|
| `ax init [name]` | 初始化新的 Axon 项目 |
| `ax flow run` | 运行全自动化工作流 (Spec -> Plan -> Work -> Verify) |
| `ax mcp` | 启动 MCP 服务，用于 IDE 插件集成 (Cursor/Trae/VSCode) |
| `ax spec init` | 交互式创建项目规格 |
| `ax spec analyze` | 将规格文档优化为专业 PRD.md |
| `ax docs add <file>` | 导入文档 (PDF, Word, MD) 到项目 |
| `ax docs add-dir [dir]` | 批量导入目录下所有文档 (默认为 ./docs) |
| `ax plan` | 从规格生成任务图 |
| `ax work` | 执行下一个任务 |
| `ax status` | 查看项目进度与阻塞诊断 |
| `ax doctor` | 诊断环境问题 |
| `ax skills find [query]` | 从 skills.sh 查找官方技能 |
| `ax skills install <owner/repo@skill>` | 安装技能到当前项目 |
| `ax clean --clutter` | 清理冗余 Agent 文件夹（.claude/.cursor/...） |

## ⚙️ 配置

首次配置清单见：[GUIDE.zh-CN.md](./docs/GUIDE.zh-CN.md)。

### LLM 提供商配置

Axon 与 [OhMyOpenCode (OMO)](https://github.com/code-yeongyu/oh-my-opencode) 集成，实现无缝的多提供商支持：

```bash
# 配置 OMO（可选，用于增强功能）
bunx oh-my-opencode install
omo config set-provider antigravity

# Axon 自动检测并使用 OMO 配置
ax plan  # 使用配置的提供商

**Provider 优先级：**
1. **CLI 模式** - 使用 OpenCode CLI (继承完整的 OMO 能力)
2. **Direct 模式** - 读取 OMO 配置并自动解析 **Antigravity** 刷新令牌
3. **Fallback 模式** - 使用 `ANTHROPIC_API_KEY` 等环境变量
```

### 环境变量

```bash
# 必需（回退模式）
ANTHROPIC_API_KEY=sk-ant-...

# 可选（其他提供商）
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

### 项目配置

编辑 `.axon/config.yaml`:

```yaml
version: "1.0"

project:
  name: "my-project"
  description: "项目描述"

agents:
  sisyphus:
    model: "claude-sonnet-4-20250514"
    provider: "anthropic"
    temperature: 0.7
    max_tokens: 8000

safety:
  daily_token_limit: 1000000
  cost_alert_threshold: 10.0
  auto_pause_on_error: true
```

## 🏗️ 架构设计

Axon 基于模块化架构构建，将需求定义、任务规划和代理执行清晰分离。

```mermaid
graph TD
    User([用户 CLI]) --> Commands[Axon 命令: init, spec, plan, work]
    
    subgraph "Axon 核心引擎"
        Commands --> Spec[OpenSpec 管理器]
        Spec --> Beads[Beads 引擎: 图生成与执行]
        Beads --> Skills[技能库: 匹配与注入]
        Skills --> Orch[任务编排器]
    end
    
    subgraph "LLM 层"
        Orch --> LLMInt[统一 LLM 接口]
        LLMInt --> OMO[OMO 配置 & Antigravity 认证]
        OMO --> Providers[提供商: Anthropic, Google Gemini, OpenAI, etc.]
    end
```

### 核心组件说明：

1.  **OpenSpec 管理器**: 解析并管理规格说明 (`.openspec/spec.md`)，确保 AI 始终拥有需求的“单一真理来源”。
2.  **Beads 引擎**: 
    *   **规划 (Planning)**: 将规格说明转换为由原子任务组成的有向无环图 (DAG)。
    *   **执行 (Execution)**: 管理任务依赖、状态持久化 (`graph.json`) 以及顺序执行流程。
3.  **技能库 (Skills Library)**: 可复用代码模式的仓库。系统会自动匹配相关技能并将其注入到 AI 智能体的上下文中。
4.  **任务编排器 (Agent Orchestrator)**: 协调专门的 AI 代理（如通用型的 "Sisyphus"）来执行具体的任务珠子。
5.  **统一 LLM 接口**: 厂商中立的抽象层。它集成了 **OhMyOpenCode**，提供多供应商故障转移和一致的 API 访问。

---

## 🧪 开发

### 运行测试

```bash
# 运行所有测试
bun test

# 类型检查
bun run type-check

# 代码检查和格式化
bun run lint
```

### 构建

```bash
# 构建编译后的二进制文件
bun run build

# 构建 JavaScript 输出
bun run build:js
```

## 📖 文档
 
- [**用户指南**](./docs/GUIDE.zh-CN.md) - **从这里开始** (设计理念, 架构, 功能, API)
- [贡献指南](./CONTRIBUTING.md)
- [更新日志](./CHANGELOG.md)

## 🤝 贡献

欢迎贡献！详情请阅读我们的[贡献指南](./CONTRIBUTING.md)，了解行为准则和提交 PR 的流程。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件。

## 🙏 致谢

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - 规格格式
- [OhMyOpenCode](https://github.com/code-yeongyu/oh-my-opencode) - 多提供商 LLM 集成
- [OpenCode](https://github.com/anomalyco/opencode) - AI 编程智能体核心
- [FindSkills](https://skills.sh/) - 技能发现与管理
- [Beads](https://github.com/steveyegge/beads) - 分布式任务图系统
- [Anthropic](https://anthropic.com) - Claude AI 模型
- [Bun](https://bun.sh) - 快速的一体化 JavaScript 运行时

## 📮 支持

- 📧 邮箱: support@axon.dev
- 💬 Discord: [加入我们的社区](https://discord.gg/Zu9YJ6zHbd)
- 🐛 问题: [GitHub Issues](https://github.com/arrislink/axon/issues)

---

用 🧠 制作，Axon 团队出品
