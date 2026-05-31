# Changelog

All notable changes to the `web-ux-test` plugin are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-31

### Added

- Initial MVP release.
- Plugin scaffold with Copilot/Codex, Claude, and `.codex-plugin/` manifests.
- Test plan YAML schema (Ajv 2020-12) with strict per-action validation.
- Workflow state machine (14 phases) with deterministic transition table.
- Atomic JSON state store with file-lock.
- `web-ux-test` CLI exposing `init`, `plan`, `auth`, `selectors`, `test`, `run`, `failure`, `repair`, `report`, `state`, and `agent` command groups.
- Playwright generator + runner + storage-state auth scaffolding.
- Deterministic rule-based failure classifier with 8 categories.
- Markdown and HTML report generators.
- Repair proposal schema + approval-gated apply with backups.
- Thin MCP server (`mcp-workflow/`) exposing 10 high-level workflow tools.
- Lifecycle hooks: `validate-plan` (PostToolUse) and `deny-auth-credentials` (PreToolUse).
- Orchestrator agent, 6 private subagents, 8 skills.
- Documentation: README, workflow, schema, auth, MCP, Copilot CLI adapter.

### Notes

- Distinct from the previously removed `web-ux-testing` plugin. The plugin name is `web-ux-test`.
- Copilot CLI adapter ships as documented interface stubs; full implementation is deferred to a future release.
- No MCP App UI in this release.
