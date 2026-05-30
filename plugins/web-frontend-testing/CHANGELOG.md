# Changelog

All notable changes to the `web-frontend-testing` plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the plugin uses [semantic versioning](https://semver.org/).

## 0.2.0 — 2026-05-30

### Added

- First-class Playwright CLI workflow alongside the existing Playwright MCP workflow. CLI is now the preferred runner for execution and regression work; MCP is preserved for live exploration and MCP-specific evidence capture.
- New private agent `web-frontend-testing-cli-execution` for one CLI target per invocation (existing spec, generated spec, plan command, or grep target).
- New skill `run-playwright-cli-frontend-test` for running one Playwright CLI target with optional visible session and pre-test authentication.
- New skill `convert-web-frontend-plan-to-playwright-tests` plus deterministic generator script that compiles scenario `executable_steps` into Playwright spec files.
- Plan schema additions: `cli_session` (plan-level and per-scenario), `executable_steps`, typed `locator`, `convert_to_regression_test`, `test_file`, `test_command`, and `pre_test_auth_session` for manual sign-in before tests.
- Interactive CLI session controls: `show_cli_session` (visible running session) and `pre_test_auth_session` (start/show CLI session before tests so the user can authenticate manually; supports `user_confirmation`, `storage_state_written`, and `exit_code` ready signals).
- npm script `generate:tests` for the new generator.
- Plugin `README.md` and this `CHANGELOG.md`.
- Validation tests and a generator test (`test/validate-plan.test.mjs`, `test/generate-playwright-tests.test.mjs`) plus a CLI fixture (`test/fixtures/plans/cli-executable-steps-plan.yaml`).

### Changed

- Orchestrator (`web-frontend-testing`) now routes CLI targets to `web-frontend-testing-cli-execution`, preserves the selected runner through every handoff, and surfaces CLI session/auth choices.
- Plan agent (`web-frontend-testing-plan`) and requirements agent (`web-frontend-testing-requirements`) document runner selection (CLI default), CLI session preferences, and pre-test auth configuration.
- MCP execution agent (`web-frontend-testing-execution`) and `execute-playwright-mcp-scenario` skill restate boundaries so CLI work is delegated to the new CLI agent.
- `lib/plan-lint.mjs` enforces CLI-specific rules: CLI/hybrid plans must declare a deterministic CLI target; `pre_test_auth_session` is gated on a compatible auth strategy; `storage_state_written` requires a path; `exit_code` requires a command. `cli_session` metadata under a `playwright-mcp` plan emits a warning.
- `schemas/web-frontend-test-plan.schema.yaml` extended with the new fields above while preserving existing required properties.
- Manifests (`plugin.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`) registered the new private agent and updated descriptions, keywords, and prompts to reflect CLI-first execution.

### Validation

- `npm test` runs 30 tests covering hooks, plan validation (including CLI/hybrid/pre-auth rules), and the new generator.

## 0.1.0

Initial release with intake, scan, plan, MCP execution, and dual-report workflow.
