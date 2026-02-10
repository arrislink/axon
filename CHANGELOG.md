# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] - 2026-02-10

### Changed
- **Keywords**: Added related open-source projects (`opencode`, `oh-my-opencode`, `omo`, `findskills`, `beads`) as keywords in `package.json` for better discoverability.

## [1.0.4] - 2026-02-10

### Fixed
- **Empty Spec Issue**: Added robust JSON parsing for `opencode` CLI events and a safety fallback to templates if AI generation fails or returns empty content.
- **Model Tracking**: Improved model ID extraction in `OpenCodeLLMClient` to correctly identify the active model in logs and `ax config test`.

## [1.0.3] - 2026-02-10

### Changed
- **Optimization**: Significantly reduced npm package size (from 61MB to <1MB) by excluding self-compiled binaries.
- **Improved Visibility**: Fixed README display issue on npm registry.

## [1.0.2] - 2026-02-10

### Added
- Integrated Skills system: Automatic skill matching and injection in `BeadsExecutor`.

### Changed
- Improved documentation clarity regarding OpenCode/OMO core roles.
- Enhanced Git safety checks and branch protection.

## [1.0.1] - 2026-02-10

### Added
- Comprehensive User Guides: `docs/GUIDE.md` and `docs/GUIDE.zh-CN.md`.
- Full-flow tutorial (REST API building) in the new guides.
- Detailed Team Collaboration workflow documentation (Git strategy, shared skills).
- Automatic Skill matching and injection in `BeadsExecutor`.
- Intelligent conflict detection and resolution in `ax init`.
- Performance-oriented dynamic imports for command handlers.

### Changed
- Explicitly credited **OpenCode** and **OhMyOpenCode (OMO)** as core engines in all docs.
- Refined `README.md` and `README.zh-CN.md` with better value propositions.
- Replaced `inquirer` with `prompts` for significant bundle size reduction.
- Switched to dynamic imports for improved CLI startup speed.
- Optimized API documentation by consolidating it into the User Guide.

### Fixed
- Fixed missing skill search integration during `ax work` execution.
- Resolved type-check and linting errors in `version-check.ts`.
- Improved Git safety checks (branch protection and dirty tree prevention).
- Corrected internal PRD links in documentation.

## [1.0.0] - 2026-02-09

### Added
- Initial release of Axon CLI
- Core commands: `init`, `spec`, `plan`, `work`, `skills`, `status`, `doctor`
- OpenSpec integration for specification-driven development
- Beads engine for task graph generation and execution
- Skills library with search and matching
- Agent orchestration with multiple AI models
- Cost tracking and safety limits
- Configuration management with YAML
- Template system for skills
- Unit tests for core modules (29 tests)
- TypeScript + Bun runtime
- Comprehensive error handling
- Interactive prompts with Inquirer
- Progress indicators with Ora
- Colorized CLI output with Chalk

### Features
- **Specification-Driven Development**: Define requirements before coding
- **Task Traceability**: Every code line maps to a task bead
- **Knowledge Reuse**: Auto-match validated skill templates
- **Cost Control**: Smart token usage tracking
- **Multi-Agent Support**: Sisyphus, Oracle, Background agents
- **Provider Flexibility**: Anthropic, OpenAI, Google support

### Technical
- Built with TypeScript 5.3
- Powered by Bun 1.1+
- Zod schema validation
- Biome for linting and formatting
- Vitest for unit testing

## [0.1.0] - 2026-02-01

### Added
- Project structure and initial setup
- Basic CLI scaffolding
- Configuration schema design
- PRD and technical documentation

---

[Unreleased]: https://github.com/arrislink/axon/compare/v1.0.5...HEAD
[1.0.5]: https://github.com/arrislink/axon/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/arrislink/axon/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/arrislink/axon/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/arrislink/axon/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/arrislink/axon/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/arrislink/axon/releases/tag/v1.0.0
[0.1.0]: https://github.com/arrislink/axon/releases/tag/v0.1.0
