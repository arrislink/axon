# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Unified LLM provider system with OMO integration
- Auto-detection of LLM mode (CLI, direct, fallback)
- Support for 75+ LLM providers via OhMyOpenCode
- Bilingual documentation (English and Chinese)

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

[Unreleased]: https://github.com/arrislink/axon/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arrislink/axon/releases/tag/v1.0.0
[0.1.0]: https://github.com/arrislink/axon/releases/tag/v0.1.0
