# Axon 2.0 使用指南

## 快速上手

### 1. 环境检查

```bash
ax doctor
```

确保所有依赖已安装。

### 2. 初始化项目

```bash
ax init my-project
cd my-project
```

### 3. 执行任务

```bash
ax drive "实现用户登录功能"
ax drive "创建 REST API"
ax drive "添加单元测试"
```

## 核心概念

### ax drive

主入口命令，将自然语言需求转换为代码：

```bash
ax drive "实现 JWT 认证，包含登录/注册/登出"
ax drive "添加用户管理 CRUD 接口"
ax drive "修复登录页面的样式问题"
```

选项：
- `--dry-run` 预览不执行
- `--no-verify` 跳过验证

### 任务图 (Beads)

Axon 将大任务分解为小任务 (Beads)：

- 每个 Bead 有独立的状态
- 支持依赖关系
- 可断点续传

### 技能 (Skills)

使用 skills.sh 管理最佳实践：

```bash
ax skills find "JWT"
ax skills add vercel-labs/agent-skills
ax skills list
```

## 工作流

```
1. ax drive "<需求>"
   ↓
2. 生成 Spec
   ↓
3. 生成 Beads
   ↓
4. 顺序执行
   ↓
5. 验证结果
   ↓
6. 更新状态
```

## 项目结构

```
my-project/
├── .axon/          # Axon 配置
├── .beads/         # 任务图
├── .openspec/      # 规格文档
├── .skills/        # 技能
└── src/            # 代码
```

## 验证

Axon 执行后会自动验证：

- 类型检查 (TypeScript)
- Lint
- 测试

## 常见问题

### Q: 如何跳过验证？
A: `ax drive "<task>" --no-verify`

### Q: 如何查看进度？
A: `ax status`

### Q: 如何从中断恢复？
A: 直接运行 `ax drive`，会自动从上次中断处继续。

## 高级

### 自定义验证命令

在 `.axon/config.yaml` 中配置：

```yaml
verification:
  test_command: bun test
  type_check: bun run type-check
  lint: bun run lint
```

### 环境变量

```bash
ANTHROPIC_API_KEY=sk-ant-...  # 必需
```

## 语言切换

Axon 会自动检测系统语言：

```bash
# 英文环境
LANG=en_US.UTF-8 ax drive "..."

# 中文环境
LANG=zh_CN.UTF-8 ax drive "..."
```

## 参考

- [Axon GitHub](https://github.com/arrislink/axon)
- [English Guide](./GUIDE.md)
