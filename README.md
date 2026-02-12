<p align="center">
  <img src="assets/logo.svg" width="120" height="120" alt="Axon Logo">
</p>

<h1 align="center">Axon 2.0</h1>

<p align="center">
  <strong>🧠 AI-Driven Development OS</strong><br>
  From requirements to production-ready code, let AI be your development partner.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@arrislink/axon">
    <img src="https://img.shields.io/npm/v/@arrislink/axon.svg?style=flat-square&color=blue" alt="npm version">
  </a>
  <a href="https://github.com/arrislink/axon/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/arrislink/axon.svg?style=flat-square&color=green" alt="license">
  </a>
  <img src="https://img.shields.io/badge/bun-%3E%3D1.1.0-black?style=flat-square&color=f9f1e1" alt="bun version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-black?style=flat-square&color=339933" alt="node version">
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#examples">Examples</a>
</p>

---

## What is Axon?

Axon is an AI-driven development operating system that transforms natural language requirements into production-ready code. It bridges the gap between human intent and machine implementation through intelligent analysis, planning, and execution.

### Key Capabilities

- **📝 Intelligent Requirement Analysis**: Parses natural language, requirement files, and directories to extract structured specifications
- **📊 Automatic PRD Generation**: Creates comprehensive Product Requirements Documents with user stories, entities, workflows
- **🎯 Smart Task Decomposition**: Breaks down complex features into atomic, parallelizable "beads"
- **⚡ Automated Execution**: Orchestrates AI agents to implement each task with context awareness
- **✅ Trust but Verify**: Independently verifies all implementations against acceptance criteria

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Input                            │
│          (Natural Language / Req Files / Directives)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Requirement Analysis Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Parser    │→ │   Analyzer   │→ │  PRD Generator   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Perception Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Repomod    │  │    Skills    │  │   Preferences    │  │
│  │  (Codebase)  │  │  (Best Prac) │  │   (User Prefs)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Planning Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │Enhanced Spec │→ │Bead Generator│→ │Execution Planner │  │
│  │  (PRD JSON)  │  │  (Task DAG)  │  │  (Parallelize)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Execution Layer                             │
│                    OMO (OpenCode) Agent                      │
│              Spawns subprocess per bead with full context   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Verification Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Type Check  │  │     Lint     │  │      Tests       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Bun** >= 1.1.0
- **Node.js** >= 18
- **Git**
- **OpenCode CLI**: `npm i -g opencode`
- **ANTHROPIC_API_KEY** (for AI capabilities)

### Installation

```bash
npm i -g @arrislink/axon
```

### Verify Setup

```bash
ax doctor
```

### Your First Project

```bash
# Initialize project
ax init my-project
cd my-project

# Method 1: Direct natural language input
ax drive "Implement a user authentication system with JWT"

# Method 2: From requirement file (recommended for production)
ax drive "Build auth system" --req ./requirements/auth.md

# Method 3: Review PRD before execution
ax drive "Build payment" --req ./requirements/payment.md --analyze-only
# Review .openspec/spec.enhanced.json
ax drive "Build payment" --req ./requirements/payment.md

# Check status
ax status
```

---

## Features

### 📝 Multiple Input Methods

```bash
# Natural language
ax drive "Create a REST API for managing todos"

# From file
ax drive "Feature name" --req ./docs/requirements.md

# From directory
ax drive "Feature name" --req ./requirements/

# Analyze only (review before execution)
ax drive "Feature" --req ./req.md --analyze-only
```

### 🧠 Intelligent Analysis

Extracts from your requirements:
- **User Personas**: Target users with goals and pain points
- **User Stories**: Standard format with acceptance criteria
- **Data Entities**: Domain models with relationships
- **Workflows**: Business processes and state transitions
- **Technical Constraints**: Performance, security, scalability

### 🎯 Smart Planning

Generates execution plans with:
- **Dependency Graph**: Hard/soft dependencies between tasks
- **Parallel Groups**: Tasks that can execute concurrently
- **Critical Path**: Longest dependency chain
- **Risk Assessment**: Low/medium/high risk classification
- **Complexity Estimation**: Story points and hour estimates

### ⚡ Reliable Execution

- **Resumable**: Automatically resumes from interruptions
- **Verifiable**: Independent verification of each task
- **Context-Aware**: Full codebase context + skills injection
- **Trust but Verify**: Never assumes success, always validates

### 🛠️ Skills Integration

```bash
# Find and install best practices
ax skills find "JWT"
ax skills add stripe-integration
ax skills add security-guidelines
```

Skills automatically inject into:
- PRD generation
- Bead instructions
- Code implementation

---

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `ax init <name>` | Initialize new project | `ax init my-app` |
| `ax drive "<task>"` | Execute with AI | `ax drive "Build API"` |
| `ax drive "<task>" --req <path>` | From requirement file | `ax drive "Auth" --req ./req.md` |
| `ax drive "<task>" --analyze-only` | Generate PRD only | `ax drive "Feature" --analyze-only` |
| `ax drive "<task>" --dry-run` | Preview execution | `ax drive "Build" --dry-run` |
| `ax status` | Show project status | `ax status` |
| `ax skills find <query>` | Search skills | `ax skills find "React"` |
| `ax skills add <pkg>` | Install skill | `ax skills add stripe` |
| `ax skills list` | List installed | `ax skills list` |
| `ax doctor` | Check environment | `ax doctor` |

---

## Documentation

### Core Guides

- **[Complete Guide](./docs/GUIDE.md)** - Comprehensive usage manual
- **[Requirement Analysis](./docs/requirement-analysis.md)** - PRD generation from requirements
- **[Enhanced Planning](./docs/enhanced-planning.md)** - Advanced planning features

### Quick References

- [Command Reference](#commands-reference)
- [Architecture Overview](#core-architecture)
- [Best Practices](./docs/GUIDE.md#best-practices)
- [Troubleshooting](./docs/GUIDE.md#troubleshooting)

---

## Examples

### Example 1: Simple API

```bash
ax drive "Create a REST API for a todo list with CRUD operations"
```

### Example 2: With Requirements File

Create `requirements/auth.md`:

```markdown
# Authentication System

## Requirements
- User registration with email/password
- JWT-based authentication
- Password reset via email
- Token refresh mechanism

## Tech Stack
- Node.js + Express
- PostgreSQL
- JWT + bcrypt

## Acceptance Criteria
- [ ] Registration validates email format
- [ ] Password must be 8+ chars with letters and numbers
- [ ] JWT expires after 24 hours
- [ ] Refresh tokens valid for 7 days
```

Execute:
```bash
ax drive "Build auth system" --req ./requirements/auth.md
```

### Example 3: Complex Feature

```bash
# Step 1: Analyze and review
ax drive "Build e-commerce checkout" --req ./requirements/checkout.md --analyze-only

# Step 2: Review generated PRD
vim .openspec/spec.enhanced.json

# Step 3: Execute when ready
ax drive "Build e-commerce checkout" --req ./requirements/checkout.md
```

More examples in [examples/requirements/](./examples/requirements/)

---

## Project Structure

```
my-project/
├── .axon/                  # Axon configuration
│   ├── config.yaml         # Settings
│   ├── verify.json         # Verification commands
│   └── prefs.md            # User preferences
├── .openspec/              # Specifications
│   └── spec.enhanced.json  # Generated PRD
├── .beads/                 # Task execution graph
│   └── graph.enhanced.json # Bead DAG with status
├── .skills/                # Installed skills
├── requirements/           # Your requirement documents
├── src/                    # Source code (generated & modified)
└── package.json
```

---

## Configuration

### Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
export LLM_MODEL=claude-3-sonnet-20240229
export LLM_MAX_TOKENS=4096
```

### Config File

Create `~/.omo/config.yaml`:

```yaml
api_key: sk-ant-api03-...
model: claude-3-sonnet-20240229
max_tokens: 4096
temperature: 0.2
base_url: https://api.anthropic.com
```

### Project-level Config

Create `.axon/verify.json`:

```json
{
  "testCommand": "bun test",
  "typeCheckCommand": "bun run type-check",
  "lintCommand": "bun run lint"
}
```

---

## How It Works

### 1. Requirement Analysis

When you run `ax drive`, Axon:

1. **Parses Input**: Reads natural language or requirement files
2. **Analyzes Intent**: Extracts core goals, entities, workflows
3. **Detects Ambiguity**: Scores clarity (0-100) and suggests clarifications
4. **Estimates Effort**: Classifies as hours/days/weeks/months

### 2. PRD Generation

Creates a comprehensive specification:

```json
{
  "metadata": { "title": "...", "description": "..." },
  "analysis": { "intent": "...", "ambiguity_score": 25 },
  "personas": [...],
  "stories": [...],
  "entities": [...],
  "workflows": [...],
  "implementation": { "tech_stack": [...] }
}
```

### 3. Bead Generation

Decomposes PRD into executable tasks:

```
📈 Bead Graph Summary:
  Total Beads: 12
  Critical Path: 7 beads
  Parallel Groups: 4
  Risk Level: medium
```

### 4. Execution

For each bead:
1. Load full context (codebase + skills + preferences)
2. Spawn OMO agent with context
3. Execute implementation
4. Verify against acceptance criteria
5. Update status and continue

### 5. Verification

"Trust but Verify" principle:
- Never assumes OMO succeeded
- Runs independent verification
- Type checking, lint, tests
- Custom acceptance criteria

---

## Roadmap

- [x] Core execution engine
- [x] Requirement analysis
- [x] PRD generation
- [x] Enhanced planning with parallelization
- [x] Skills integration
- [x] Verification layer
- [ ] Multi-agent collaboration
- [ ] Automatic refactoring suggestions
- [ ] CI/CD integration
- [ ] Web dashboard

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/arrislink/axon.git
cd axon
bun install
bun run build
bun run test
```

---

## Community

- 💬 [Discord](https://discord.gg/axon)
- 🐦 [Twitter](https://twitter.com/axon)
- 📧 [Email](mailto:support@axon.dev)
- 🐛 [Issues](https://github.com/arrislink/axon/issues)

---

## License

MIT © [ArrisLink](https://github.com/arrislink)

---

<p align="center">
  <img src="assets/logo.svg" width="60" height="60" alt="Axon Logo"><br><br>
  Built with ❤️ by the Axon team
</p>
