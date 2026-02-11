# Contributing to Axon

Thank you for your interest in contributing to Axon! 🧠

We welcome contributions from the community. This document will guide you through the contribution process.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if applicable**
- **Provide your environment details** (OS, Bun version, etc.)

Use the [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md).

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the proposed functionality**
- **Explain why this enhancement would be useful**
- **List any similar features in other tools**

Use the [feature request template](./.github/ISSUE_TEMPLATE/feature_request.md).

### Pull Requests

1. Fork the repository
2. Create a new branch from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Make your changes
4. Ensure tests pass:
   ```bash
   bun test
   bun run type-check
   bun run lint
   ```
5. Commit your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. Push to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```
7. Open a Pull Request

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.1.0
- Git
- An Anthropic API key (for testing LLM features)

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/axon.git
cd axon

# Install dependencies
bun install

# Link for global testing
npm link

# Verify setup
ax --help

# Run tests
bun test

# Run in development mode
bun run dev --help
```

### Project Structure

```
src/
├── commands/        # CLI command implementations
├── core/           # Core business logic
│   ├── config/     # Configuration management
│   ├── beads/      # Task graph engine
│   ├── agents/     # AI agent orchestration
│   ├── skills/     # Skills library
│   ├── spec/       # Specification management
│   ├── llm/        # Unified LLM client
│   └── integrations/ # External integrations
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

tests/
└── unit/           # Unit tests

templates/
└── skills/         # (Deprecated) Skills are now managed via external repositories
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all source files
- Enable strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Use type aliases for unions/intersections

### Code Style

We use Biome for linting and formatting:

```bash
# Format code
bun run format

# Lint code
bun run lint
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add multi-provider LLM support
fix: resolve config validation error
docs: update README with global install instructions
```

### Testing

- Write unit tests for new features
- Ensure all tests pass before submitting PR
- Maintain or improve code coverage
- Place tests in `tests/unit/` directory

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/config.test.ts
```

## Adding New Features

### Adding a New Command

1. Create command file in `src/commands/`:
   ```typescript
   import { Command } from 'commander';
   
   export const myCommand = new Command('my-command')
       .description('Description')
       .action(async () => {
           // Implementation
       });
   ```

2. Register in `src/index.ts`:
   ```typescript
   import { myCommand } from './commands/my-command';
   program.addCommand(myCommand);
   ```

3. Add tests in `tests/unit/`
4. Update documentation

### Adding a New Skill Template

1. Axon integrates the official [skill.sh](https://skills.sh) ecosystem via `npx skills` (and wrappers under `ax skills`).
2. To create a new skill, contribute to a skills repository (e.g., [agent-skills](https://github.com/vercel-labs/agent-skills)) following that repository’s conventions.
3. Once published, users can:
   - Discover: `ax skills find [query]` (official) / `ax skills search <query>` (local)
   - Install: `ax skills install <owner/repo@skill>` (or `npx skills add <owner/repo@skill>`)
   - Maintain: `ax skills check` / `ax skills update`
4. If you accidentally selected too many target agents during install and created redundant folders, run `ax clean --clutter`.

## Documentation

- Update README.md for user-facing changes
- Update PRD.md for architectural changes
- Add JSDoc comments for public APIs
- Keep CHANGELOG.md up to date

## Review Process

1. All PRs require at least one approval
2. CI checks must pass (tests, type-check, lint)
3. Maintain code quality and test coverage
4. Address review feedback promptly

## Questions?

- Open an issue for questions
- Join our [Discord community](https://discord.gg/Zu9YJ6zHbd)
- Email: support@axon.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Axon! 🧠
