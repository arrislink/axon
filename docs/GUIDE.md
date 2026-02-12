<p align="center">
  <img src="../assets/logo.svg" width="100" height="100" alt="Axon Logo">
</p>

<h1 align="center">Axon 2.0 Complete Guide</h1>

<p align="center">
  🧠 <strong>AI-Driven Development OS</strong> - From requirements to production-ready code.
</p>

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Quick Start](#quick-start)
3. [Core Workflows](#core-workflows)
4. [Requirement Analysis](#requirement-analysis)
5. [PRD & Planning](#prd--planning)
6. [Execution & Verification](#execution--verification)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Installation & Setup

### Prerequisites

- **Bun** >= 1.1.0 (primary runtime)
- **Node.js** >= 18 (fallback)
- **Git**
- **OpenCode CLI**: `npm i -g opencode`
- **ANTHROPIC_API_KEY**: Required for AI capabilities

### Install Axon

```bash
npm i -g @arrislink/axon
```

### Verify Installation

```bash
ax doctor
```

Expected output:
```
🔍 Axon 2.0 环境诊断

  ✓ Runtime: Node v20.x.x, Bun 1.1.x
  ✓ Git: Installed
  ✓ OpenCode: Installed
  ✓ Repomix: Installed
  ✓ skills.sh: Installed
  ✓ ANTHROPIC_API_KEY: Configured
  ✓ API Connectivity: Reachable
```

---

## Quick Start

### 1. Initialize a New Project

```bash
ax init my-project
cd my-project
```

This creates:
```
my-project/
├── .axon/              # Axon configuration
├── .openspec/          # Specification documents
├── .beads/             # Task execution graph
├── src/                # Source code
└── package.json
```

### 2. Execute Your First Task

**Method 1: Direct Input** (Quick & Simple)
```bash
ax drive "Implement a user login system with JWT authentication"
```

**Method 2: From Requirement File** (Recommended for complex features)
```bash
# Create a requirement document first
cat > requirements/auth.md << 'EOF'
# User Authentication System

## Requirements
- Email/password registration
- JWT-based login
- Password reset via email
- Token refresh mechanism

## Tech Stack
- Node.js + Express
- PostgreSQL
- JWT
- bcrypt
EOF

# Then execute with the requirement file
ax drive "Build authentication system" --req ./requirements/auth.md
```

**Method 3: Analyze Only** (Review PRD before execution)
```bash
ax drive "Build payment system" --req ./requirements/payment.md --analyze-only
# Review the generated PRD at .openspec/spec.enhanced.json
# Then execute normally
ax drive "Build payment system" --req ./requirements/payment.md
```

### 3. Monitor Progress

```bash
ax status
```

---

## Core Workflows

### Workflow 1: Rapid Prototyping

For quick experiments and MVPs:

```bash
ax drive "Create a REST API for a todo list with CRUD operations"
```

Axon will:
1. Analyze your request
2. Generate a PRD
3. Create implementation beads
4. Execute and verify

### Workflow 2: Structured Development

For production features with clear requirements:

```bash
# Step 1: Write detailed requirements
cat > requirements/feature.md << 'EOF'
# Feature Specification

## User Stories
- As a user, I want to... so that...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Requirements
- Database schema
- API endpoints
- Security considerations
EOF

# Step 2: Analyze and review
ax drive "Implement feature" --req ./requirements/feature.md --analyze-only

# Step 3: Review PRD at .openspec/spec.enhanced.json
# Step 4: Execute when ready
ax drive "Implement feature" --req ./requirements/feature.md
```

### Workflow 3: Iterative Refinement

For evolving projects:

```bash
# First iteration
ax drive "Build basic user management" --analyze-only

# Review and refine requirements
vim requirements/feature.md

# Second iteration
ax drive "Build basic user management" --req ./requirements/feature.md --analyze-only

# Execute when satisfied
ax drive "Build basic user management" --req ./requirements/feature.md
```

---

## Requirement Analysis

### What Gets Analyzed

Axon's Unified Analyzer extracts:

1. **Intent**: Core goal of the request
2. **Scope**: What's in/out of scope
3. **Entities**: Domain models and data structures
4. **Workflows**: Business processes
5. **Ambiguity Score**: 0-100 (lower is better)
6. **Clarification Questions**: For vague requirements
7. **Effort Estimation**: hours/days/weeks/months

### Example Analysis Output

```
📊 Analysis Results:
  Title: E-commerce Payment System
  Entities: 5 (Order, Payment, User, Product, Transaction)
  Stories: 8
  Workflows: 3 (checkout, refund, notification)
  Estimated Effort: weeks

⚠️  Clarification Recommended:
   ❓ Which payment providers should be supported? (Stripe, PayPal, etc.)
   ❓ Is PCI compliance required?
   ❓ What's the expected transaction volume?

✓ PRD saved to: .openspec/spec.enhanced.json
```

### Requirement File Formats

Axon supports multiple formats:

**Markdown (.md)** - Recommended
```markdown
# Feature Name

## Requirements
- [ ] Feature 1: Description
- [ ] Feature 2: Description

## Technical Stack
- Framework: Express.js
- Database: PostgreSQL

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

**JSON (.json)**
```json
{
  "title": "Feature Name",
  "requirements": ["req1", "req2"],
  "tech_stack": ["Express", "PostgreSQL"]
}
```

**YAML (.yaml/.yml)**
```yaml
title: Feature Name
requirements:
  - req1
  - req2
tech_stack:
  - Express
  - PostgreSQL
```

---

## PRD & Planning

### Enhanced PRD Structure

The generated PRD (`.openspec/spec.enhanced.json`) includes:

```json
{
  "metadata": {
    "title": "Project Name",
    "description": "...",
    "status": "draft"
  },
  "analysis": {
    "intent": "Core goal",
    "scope": { "in_scope": [], "out_of_scope": [] },
    "ambiguity_score": 25,
    "estimated_effort": "weeks"
  },
  "personas": [
    { "name": "User", "role": "...", "goals": [] }
  ],
  "stories": [
    { "id": "story_001", "action": "...", "acceptance_criteria": [] }
  ],
  "entities": [
    { "name": "User", "attributes": [] }
  ],
  "workflows": [
    { "name": "Login Flow", "steps": [] }
  ],
  "business_rules": [],
  "technical_constraints": [],
  "implementation": {
    "tech_stack": [],
    "architecture_decisions": []
  }
}
```

### Bead Graph Generation

From the PRD, Axon generates an intelligent Bead Graph:

```
📈 Bead Graph Summary:
  Total Beads: 15
  Critical Path: 9 beads
  Parallel Groups: 4
  Risk Level: medium
  Estimated Hours: 120

Execution Plan:
  Phase 1: Setup & Foundation (sequential)
    - bead_001: Initialize project structure
    - bead_002: Setup database schema
  
  Phase 2: Parallel: Core API (parallel)
    - bead_003: Implement User model
    - bead_004: Implement Auth middleware
  
  Phase 3: Parallel: Features (parallel)
    - bead_005: Login endpoint
    - bead_006: Registration endpoint
```

### Bead Properties

Each bead contains:

- **id**: Unique identifier (bead_001)
- **title**: Short, actionable title
- **description**: What this bead accomplishes
- **instruction**: Detailed implementation guidance
- **context**: Related stories, entities, workflows
- **dependencies**: Hard (blocking) and soft (preferred)
- **complexity**: Story points, hours, risk factors
- **files_to_modify/create**: Specific file paths
- **acceptance_criteria**: Verifiable completion criteria
- **can_parallelize**: Whether it can run in parallel

---

## Execution & Verification

### Execution Flow

1. **Load Bead Graph**: From `.beads/graph.enhanced.json`
2. **Find Next Beads**: Check dependencies, find executable
3. **Build Context**: Combine code context, skills, preferences
4. **Execute via OMO**: Spawn subprocess with context
5. **Verify Results**: Independent verification
6. **Update Status**: Mark complete/failed
7. **Repeat**: Until all beads complete

### Verification Types

Axon performs "Trust but Verify":

1. **Type Checking**: `bun run type-check`
2. **Linting**: `bun run lint`
3. **Testing**: `bun test`
4. **Acceptance Criteria**: Custom verification per bead

### Resume from Interruption

If the process is interrupted:

```bash
# Simply run ax drive again - it resumes automatically
ax drive "Continue implementation"
```

Axon will:
- Detect interrupted beads (status: running)
- Reset them to pending
- Continue from where it left off

---

## Advanced Features

### Skills Management

Inject best practices into your project:

```bash
# Search for skills
ax skills find "JWT"
ax skills find "React"

# Install a skill
ax skills add vercel-labs/agent-skills

# List installed skills
ax skills list
```

Skills are automatically injected into:
- PRD generation
- Bead instructions
- Code reviews

### Custom Verification

Configure verification commands in `.axon/verify.json`:

```json
{
  "testCommand": "bun test",
  "typeCheckCommand": "bun run type-check",
  "lintCommand": "bun run lint",
  "customChecks": [
    {
      "name": "Security Audit",
      "command": "npm audit"
    }
  ]
}
```

### Environment Configuration

Create `.env` file:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
LLM_MODEL=claude-3-sonnet-20240229
LLM_MAX_TOKENS=4096
```

Or configure in `~/.omo/config.yaml`:

```yaml
api_key: sk-ant-api03-...
model: claude-3-sonnet-20240229
max_tokens: 4096
temperature: 0.2
```

### Language Support

Axon auto-detects system language:

```bash
# English (default)
LANG=en_US.UTF-8 ax drive "..."

# Chinese
LANG=zh_CN.UTF-8 ax drive "..."
```

---

## Best Practices

### 1. Start with Clear Requirements

**❌ Vague:**
```bash
ax drive "Build a website"
```

**✅ Clear:**
```bash
ax drive "Build a blog website with Next.js featuring: MDX support, dark mode, RSS feed, and SEO optimization"
```

### 2. Use Requirement Files for Complex Features

For features with multiple acceptance criteria:

```bash
# Create detailed requirements
cat > requirements/payment.md << 'EOF'
# Payment System

## User Stories
1. As a customer, I want to pay with credit card
2. As a customer, I want to receive email receipts

## Technical Requirements
- PCI DSS compliance
- Stripe integration
- Idempotency keys

## Acceptance Criteria
- [ ] Payment processed in < 3 seconds
- [ ] Idempotent requests handled correctly
- [ ] Webhooks processed reliably
EOF

# Execute
ax drive "Build payment system" --req ./requirements/payment.md
```

### 3. Review PRD Before Execution

```bash
# Generate PRD only
ax drive "Feature" --req ./req.md --analyze-only

# Review the generated PRD
vim .openspec/spec.enhanced.json

# Execute when ready
ax drive "Feature" --req ./req.md
```

### 4. Handle Clarification Questions

When Axon asks clarification questions:

```
⚠️  Clarification Recommended:
   ❓ Should we support OAuth providers (Google, GitHub)?
   ❓ What's the expected user load?
```

Options:
- **Answer inline**: Update requirements file and re-run
- **Proceed anyway**: Axon will make reasonable assumptions
- **Refine requirements**: Make the requirements more specific

### 5. Use Skills for Domain Expertise

```bash
# Install relevant skills
ax skills add stripe-integration
ax skills add react-best-practices
ax skills add security-guidelines
```

### 6. Verify Regularly

Don't disable verification unless necessary:

```bash
# Good - verification enabled (default)
ax drive "Implement feature"

# Avoid - skipping verification
ax drive "Implement feature" --no-verify
```

---

## Troubleshooting

### Issue: "Analysis failed"

**Cause**: API key issue or malformed request

**Solutions**:
1. Check `ANTHROPIC_API_KEY` is set
2. Verify API key format: `sk-ant-api03-...`
3. Simplify your request
4. Check internet connectivity: `ax doctor`

### Issue: "Requirement path not found"

**Cause**: File path is incorrect

**Solutions**:
1. Use relative path from project root: `--req ./requirements/feature.md`
2. Check file exists: `ls requirements/`
3. Use absolute path if needed

### Issue: High ambiguity score

**Cause**: Request is too vague

**Example**:
```
⚠️  High ambiguity detected (85/100)
```

**Solutions**:
1. Answer clarification questions
2. Add more specific requirements
3. Define scope boundaries
4. Specify technical constraints

### Issue: Verification keeps failing

**Cause**: Test/lint configuration issue

**Solutions**:
1. Check `.axon/verify.json` configuration
2. Run verification manually: `bun test`
3. Skip verification temporarily: `--no-verify`
4. Adjust verification commands

### Issue: Process interrupted

**Solution**: Simply run `ax drive` again - it resumes automatically

### Issue: "No executable beads found"

**Cause**: Dependencies not met or all beads completed

**Solutions**:
1. Check bead status: `ax status`
2. Review dependency graph: `.beads/graph.enhanced.json`
3. Check for failed beads blocking execution

---

## Command Reference

### ax init
```bash
ax init <project-name>    # Initialize new project
```

### ax drive
```bash
ax drive "<instruction>"                    # Direct input
ax drive "<instruction>" --req <path>       # From requirement file/dir
ax drive "<instruction>" --analyze-only     # Generate PRD only
ax drive "<instruction>" --dry-run          # Preview without execution
ax drive "<instruction>" --no-verify        # Skip verification
```

### ax status
```bash
ax status                   # Show project status
```

### ax skills
```bash
ax skills find <query>      # Search for skills
ax skills add <package>     # Install a skill
ax skills list              # List installed skills
```

### ax doctor
```bash
ax doctor                   # Check environment
```

---

## File Structure Reference

```
my-project/
├── .axon/
│   ├── config.yaml         # Axon configuration
│   ├── verify.json         # Verification commands
│   └── prefs.md            # User preferences
├── .openspec/
│   ├── spec.md             # Legacy spec (if exists)
│   └── spec.enhanced.json  # Enhanced PRD
├── .beads/
│   ├── graph.json          # Legacy bead graph
│   └── graph.enhanced.json # Enhanced bead graph
├── .skills/                # Installed skills
├── requirements/           # Your requirement documents
├── src/                    # Source code
└── package.json
```

---

## Next Steps

- Read [Requirement Analysis Guide](./requirement-analysis.md)
- Read [Enhanced Planning Guide](./enhanced-planning.md)
- Check [Example Requirements](../examples/requirements/)
- Visit [GitHub Repository](https://github.com/arrislink/axon)

---

*Axon 2.0 - From requirements to production-ready code.*
