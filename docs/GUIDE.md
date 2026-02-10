# Axon User Guide

> **AI-Powered Development Operating System**

Axon is a unified AI-assisted development environment designed to solve the "context loss", "wheel reinvention", and "planning chaos" problems in AI programming. By deeply integrating **Specification-Driven Development (OpenSpec)**, **Task Management (Beads)**, and **Skill Reuse (FindSkills)**, Axon makes AI a true development partner rather than just a code completion tool.

---

## 🏗️ Design Philosophy

### The Problems We Solve

1.  **Context Amnesia**: Chat-based AI coding tools often forget long-term project architecture and decisions.
2.  **Wheel Reinvention**: Developers and AI keep rewriting the same authentication, database, or API logic without reusing established best practices.
3.  **Planning Chaos**: "Chat-to-Code" often leads to spaghetti code because there is no rigorous "Plan before Act" phase.

### Our Solution

Axon is an orchestration layer built upon the powerful **OpenCode** agentic engine and the **OhMyOpenCode (OMO)** provider system. It introduces a **Spec-Plan-Execute-Verify** loop:
1.  **Spec**: Define *what* you want (Requirements).
2.  **Plan**: Break it down into atomic tasks (Beads).
3.  **Execute**: **OpenCode** agents implement tasks one by one, using **OMO** for LLM access.
4.  **Verify**: Human review and automated checks.

---

## 🏛️ System Architecture

Axon acts as the "Brain" (Planning & Context) while **OpenCode** acts as the "Hands" (Coding & Execution).

```mermaid
graph TD
    User[User] --> CLI[Axon CLI]
    CLI --> Spec[Spec Engine]
    CLI --> Plan[Beads Planner]
    CLI --> Exec[Agent Orchestrator]
    
    Spec -->|Generates| OpenSpec[.openspec/spec.md]
    Plan -->|Reads| OpenSpec
    Plan -->|Generates| Graph[.beads/graph.json]
    
    Exec -->|Reads| Graph
    Exec -->|Uses| Skills[.skills/]
    Exec -->|Delegates to| OpenCode[**OpenCode Core**]
    
    OpenCode -->|Calls| OMO[**OhMyOpenCode**]
    OMO -->|Connects| LLM[LLM Providers]
    
    OpenCode -->|Writes| Code[Source Code]
```

### Core Components

*   **OpenSpec**: A markdown-based format for defining software specifications.
*   **Beads**: A task graph system that breaks complex features into small, manageable units of work (beads).
*   **OpenCode**: The underlying agentic engine that performs the actual coding work for each bead.
*   **OhMyOpenCode (OMO)**: The universal LLM provider middleware that powers Axon, supporting 75+ providers (Anthropic, OpenAI, etc.).
*   **Skills**: A library of reusable prompts and code templates.

---

## ✨ Key Features

### 1. Specification-First Development
Instead of jumping into code, `ax spec init` helps you clarify your requirements through an interactive interview with AI. This generates a `spec.md` that serves as the single source of truth.

### 2. Intelligent Task Planning
`ax plan` analyzes your specification and breaks it down into a dependency graph of tasks.
*   **Atomic**: Each task is small enough to be completed reliably by AI.
*   **Ordered**: Tasks are sorted by dependencies (e.g., "Create DB Schema" before "Create API").
*   **Visual**: You can visualize the plan before execution.

### 3. Agentic Execution
`ax work` executes the planned tasks.
*   **Context-Aware**: The agent knows the current task, the overall spec, and the project structure.
*   **Safe**: Changes are committed to Git after each task.
*   **Recoverable**: If a task fails, you can retry it without restarting the whole project.

### 4. Skill Injection
Axon searches your local `.skills` directory and the global library for relevant patterns. If you are building an API, it pulls in your team's standard API response wrapper skill.

### 5. Config Priority & Safety
*   **Config Priority**: CLI Args > Project Config > OMO Config > Environment Variables.
*   **Git Safety**: Prevents execution on dirty working trees and warns before committing to protected branches (`main`/`master`).

---

## 🚀 Tutorial: Building a REST API

Let's walk through a real-world scenario: **Building a simple User API with Hono.**

### Step 1: Initialize Project
Create a standard Axon project structure.

```bash
ax init my-user-api
cd my-user-api
```

### Step 2: Define Requirements (Spec)
Tell Axon what you want to build.

```bash
ax spec init
```

*Axon will ask:* "What are you building?"
*You allow:* "A Hono-based REST API with a `GET /users` endpoint that returns a list of mock users."

Axon generates `.openspec/spec.md`:
```markdown
# User API Specification
## Requirements
1.  **Server**: Use Hono framework.
2.  **API**: Implement `GET /users` returning JSON array.
3.  **Data**: Use in-memory mock data.
```

### Step 3: Generate Plan (Plan)
Convert the spec into executable tasks.

```bash
ax plan
```

Axon analyzes the spec and creates `.beads/graph.json`:
1.  **Setup Hono**: Install dependencies (`hono`, `tsx`).
2.  **Create Server**: Implement basic server structure.
3.  **Implement Route**: Add `GET /users` handler.

### Step 4: Execute (Work)
Let the AI agents build it.

```bash
ax work
```

*   **Agent** picks up "Setup Hono".
*   **Agent** runs `npm install hono`.
*   **Axon** commits: "✅ setup: Install Hono".
*   **Agent** picks up "Create Server".
*   **Agent** writes `src/index.ts`.
*   **Axon** commits: "✅ feature: Basic server setup".

### Step 5: Verify
Run the generated code.

```bash
bun start
# Server running on http://localhost:3000
```

---

## 🆚 Comparison with Other Tools

| Feature | Axon | GitHub Copilot / Cursor | Aider / OpenDevin |
| :--- | :--- | :--- | :--- |
| **Core Philosophy** | **Plan-Execute-Verify** (Agentic) | **Autocomplete** (Assistive) | **Chat-to-Code** (Autonomous) |
| **Context Awareness** | **High** (Project-wide Spec + Graph) | **Medium** (Open Files + RAG) | **High** (Repo Map) |
| **Planning** | ✅ **Explicit Task Graph** | ❌ None (Streaming) | ⚠️ Implicit (Step-by-step) |
| **Human Control** | ✅ **High** (Review Plan & Spec) | ✅ High (Accept/Reject) | ⚠️ Application Dependent |
| **Cost Control** | ✅ **Token Budgeting & Tracking** | ❌ Subscription Based | ⚠️ Often Unbounded |
| **Knowledge Reuse** | ✅ **Skill Templates** (.skills) | ❌ None | ❌ None |

---

## 📚 API & Command Reference

### Core Commands

| Command | Description |
| :--- | :--- |
| `ax init [name]` | Initialize a new Axon project with standard structure. |
| `ax spec init` | Interactively create a project specification (`.openspec/spec.md`). |
| `ax spec show` | Display the current specification. |
| `ax plan` | Generate a task graph (`.beads/graph.json`) from the specification. |
| `ax work` | Execute pending tasks in the graph. |
| `ax work --interactive` | Execute tasks with manual confirmation for each step. |
| `ax status` | detailed project progress and bead status. |

### Configuration Commands

| Command | Description |
| :--- | :--- |
| `ax config list` | List available LLM providers and models. |
| `ax config show` | Show the current resolved configuration. |
| `ax config setup` | Interactive wizard to setup LLM provider. |

### Skill Commands

| Command | Description |
| :--- | :--- |
| `ax skills search <query>` | Search for available skills. |
| `ax skills add <path>` | Import a skill into the project. |

### Utility Commands

| Command | Description |
| :--- | :--- |
| `ax doctor` | Diagnose environment issues (Node version, tool install, keys). |
| `ax doctor --fix` | Attempt to automatically fix diagnosed issues. |

---

## ⚙️ Configuration Reference

Axon uses a hierarchical configuration system.

### File: `.axon/config.yaml`
```yaml
project:
  name: "my-project"
agents:
  sisyphus:
    model: "claude-3-5-sonnet-20240620"
    provider: "anthropic"
    temperature: 0.5
safety:
  daily_token_limit: 1000000
  auto_commit: true
```

### Environment Variables
*   `ANTHROPIC_API_KEY`: Fallback key if no OMO provider is configured.
*   `OPENAI_API_KEY`, etc.: Used by OMO providers.
