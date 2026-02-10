# Changelog

All notable changes to this project will be documented in this file.

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
