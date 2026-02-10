# Changelog

All notable changes to this project will be documented in this file.

## [1.5.1] - 2026-02-10

### Fixed
- Updated unit tests to match OMO-native architecture.
- Cleaned up lint and TypeScript configuration conflicts.

## [1.5.0] - 2026-02-10

### Added
- **Multi-Path Skill Support**: Axon now supports both `.agents/skills` (Universal) and `.agent/skills` (Antigravity) directory conventions.
- **Enhanced Documentation**: Updated guides to clarify skill management and directory structures.

### Changed
- **Skill Architecture Decoupling**: Completely removed hardcoded skill templates. Axon now exclusively uses external skill repositories via `npx skills add`.
- **Core Cleanup**: Removed deprecated path utilities and optimized `SkillsLibrary` to prioritize official skill discovery patterns.

## [1.4.0] - 2026-02-10

### Added
- **Skill Orchestration**: Automatic tech-stack detection (Frontend/Node/Go/PHP) during `ax init` with interactive skill suggestions.
- **PRD Generation**: New `ax spec analyze` command to transform raw specifications into professional-grade `PRD.md`.
- **Symlinked Skills**: Support for `--symlink` in `ax skills install` for centralized management of expertise templates.
- **Custom Skill Paths**: Support for `--path` override during skill installation.

### Changed
- **Unified Analyzer**: Strategic tasks like PRD generation now default to the `oracle` agent for better architectural insights.

## [1.3.0] - 2026-02-10

### Added
- **Intelligent Docs**: Enhanced `ax docs add-dir` with automatic directory scanning, file previewing, and proactive skill suggestions.
- **Skill Injection**: Automatic detection and injection of local `write-plan` and `brainsstorm` skills into the planning and analysis prompts.
- **Skill Installation**: New `ax skills install <name>` command for quick adoption of global expertise templates.

### Changed
- **Optimized Scanning**: Document management now defaults to the `./docs` directory for faster onboarding.

## [1.2.0] - 2026-02-10

### Added
- **OMO-Native Delegation**: Axon now treats OMO (OhMyOpenCode) agents as the Single Source of Truth for LLM management.
- **Role-Based Execution**: Added support for generic roles (`sisyphus`, `oracle`, `background`) that map directly to OMO agents.
- **Environment Variable `AXON_LLM_MODE`**: Forced LLM mode support (e.g., `AXON_LLM_MODE=cli`).
- **Enhanced CLI Detection**: Used `Bun.which` for more robust path resolution of the `opencode` binary.

### Changed
- **Config Schema**: Made `model` and `provider` optional in `AgentConfig` to favor OMO delegation.
- **Simplified Defaults**: Removed hardcoded models from default project templates.
- **Improved CLI Diagnostics**: Environment variables are now preserved during CLI spawning to fix "node not found" errors.
- **Strict Mode**: Disabled automatic fallback when in CLI mode to ensure configuration issues are visible.

### Fixed
- Fixed Anthropic client crashing on non-JSON error responses from proxies.
- Corrected default Antigravity endpoint to `api.antigravity.ai`.

## [1.1.3] - 2026-02-10

### Fixed
- Hotfix for proxy error handling and endpoint correction.

## [1.1.0] - 2026-02-09

### Added
- Initial support for OMO configuration reading.
- Document management system with `ax docs` suite.
