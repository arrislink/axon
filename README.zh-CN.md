# Axon 2.0

🧠 **AI-Driven Development OS** - 从需求到代码，让 AI 成为你的开发伙伴。

## 核心架构

```
用户输入 → Axon CLI → 规划 → 执行 → 验证
              ↓
        Repomod (感知)
        skills.sh (技能)
        OMO (执行)
```

## 命令

| 命令 | 描述 |
|------|------|
| `ax init <name>` | 初始化项目 |
| `ax drive "<task>"` | AI 执行开发任务 |
| `ax status` | 显示项目状态 |
| `ax skills add <pkg>` | 安装技能 |
| `ax doctor` | 检查环境 |

## 快速开始

```bash
# 安装
npm i -g @arrislink/axon

# 初始化
ax init my-app
cd my-app

# 执行任务
ax drive "实现用户认证功能"
ax drive "添加 REST API 端点"

# 查看进度
ax status
```

## 架构

- **Perception Layer**: Repomod (代码感知) + skills.sh (技能)
- **Planning Layer**: Spec → Beads DAG
- **Execution Layer**: OMO CLI subprocess
- **Verification Layer**: Trust but Verify

## 环境要求

- Bun >= 1.1.0
- Node.js >= 18
- Git
- OpenCode CLI (npm i -g opencode)
- ANTHROPIC_API_KEY

## 文档

详细使用指南请参阅 [docs/GUIDE.zh-CN.md](./docs/GUIDE.zh-CN.md)。

## License

MIT
