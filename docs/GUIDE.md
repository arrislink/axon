# Axon 2.0 Guide

## Quick Start

### 1. Environment Check

```bash
ax doctor
```

Ensure all dependencies are installed.

### 2. Initialize Project

```bash
ax init my-project
cd my-project
```

### 3. Execute Tasks

```bash
ax drive "Implement user login"
ax drive "Create REST API"
ax drive "Add unit tests"
```

## Core Concepts

### ax drive

Main entry point - converts natural language requirements to code:

```bash
ax drive "Implement JWT auth with login/register/logout"
ax drive "Add user management CRUD API"
ax drive "Fix login page styling"
```

Options:
- `--dry-run` Preview without executing
- `--no-verify` Skip verification

### Beads (Task Graph)

Axon breaks large tasks into atomic Beads:
- Each Bead has independent status
- Supports dependency relationships
- Resume from interruption

### Skills

Manage best practices with skills.sh:

```bash
ax skills find "JWT"
ax skills add vercel-labs/agent-skills
ax skills list
```

## Workflow

1. ax drive "<requirement>"
2. Generate Spec
3. Generate Beads
4. Execute Sequentially
5. Verify Results
6. Update Status

## Project Structure

```
my-project/
├── .axon/          # Axon config
├── .beads/         # Task graph
├── .openspec/      # Spec documents
├── .skills/        # Skills
└── src/            # Code
```

## Verification

Axon automatically verifies after execution:
- Type checking (TypeScript)
- Lint
- Tests

## FAQ

**Q: How to skip verification?**
A: `ax drive "<task>" --no-verify`

**Q: How to view progress?**
A: `ax status`

**Q: How to resume from interruption?**
A: Run `ax drive` directly - it resumes automatically.

## Advanced

### Custom Verification Commands

Configure in `.axon/config.yaml`:

```yaml
verification:
  test_command: bun test
  type_check: bun run type-check
  lint: bun run lint
```

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Required
```

## Language Switching

Axon auto-detects system language:

```bash
# English
LANG=en_US.UTF-8 ax drive "..."

# Chinese
LANG=zh_CN.UTF-8 ax drive "..."
```

## References

- [Axon GitHub](https://github.com/arrislink/axon)
- [Chinese Guide](./GUIDE.zh-CN.md)
