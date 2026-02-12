# Axon 2.0

🧠 **AI-Driven Development OS** - From requirements to code, let AI be your development partner.

## Core Architecture

```
User Input → Axon CLI → Planning → Execution → Verification
                  ↓
            Repomod (Perception)
            skills.sh (Skills)
            OMO (Execution)
```

## Commands

| Command | Description |
|---------|-------------|
| `ax init <name>` | Initialize project |
| `ax drive "<task>"` | Execute task with AI |
| `ax status` | Show project status |
| `ax skills add <pkg>` | Install skill |
| `ax doctor` | Check environment |

## Quick Start

```bash
# Install
npm i -g @arrislink/axon

# Initialize
ax init my-app
cd my-app

# Execute tasks
ax drive "Implement user authentication"
ax drive "Add REST API endpoints"

# Check progress
ax status
```

## Architecture

- **Perception Layer**: Repomod (code awareness) + skills.sh (skills)
- **Planning Layer**: Spec → Beads DAG
- **Execution Layer**: OMO CLI subprocess
- **Verification Layer**: Trust but Verify

## Requirements

- Bun >= 1.1.0
- Node.js >= 18
- Git
- OpenCode CLI (`npm i -g opencode`)
- ANTHROPIC_API_KEY

## Documentation

See [docs/GUIDE.md](./docs/GUIDE.md) for detailed usage.

## License

MIT
