# Changelog

All notable changes to the **web-ux-testing-agent** plugin are documented here.

## [0.1.0] — Initial release

### Added

- Cross-agent plugin for Codex, Claude / Claude Code, and GitHub Copilot that
  turns step-by-step web UX workflows into structured YAML test plans, generated
  Playwright tests, repeatable CLI execution, and readable reports.
- **Schemas** (`schemas/`): `test-plan`, `test-step`, `test-report`, and
  `environment` JSON Schemas (draft-07).
- **Core library** (`lib/*.mjs`): plan loader, validator (schema + secret
  hygiene), normalizer, selectors, test generator, report writer, and failure
  triage — the source of truth for all surfaces.
- **Skills** (`skills/`): `plan-authoring`, `playwright-generation`,
  `playwright-execution`, `auth-state`, `failure-triage`, `report-generation`,
  each with scripts.
- **Subagents** (`agents/`): planner (orchestrator), runner, debugger, reporter,
  maintainer.
- **Runner** (`runner/`): Playwright CLI driver with `validate` / `generate` /
  `run` / `report` subcommands and traces/screenshots/video on failure.
- **MCP server** (`mcp/`): 8 data tools (`list_plans`, `get_plan`, `save_plan`,
  `validate_plan`, `run_plan`, `list_reports`, `get_report`, `debug_failure`)
  plus plan-editor and report-viewer MCP Apps.
- **Local UI** (`ui/`): Vite + React fallback (PlanEditor, ReportViewer,
  TestRunHistory) for hosts without MCP App support.
- **Copilot** integration: `.github/copilot-instructions.md` and four custom
  agents under `.github/agents/`.
- **Docs**: per-host compatibility (`codex`, `claude`, `copilot`), plus
  `mcp-app`, `test-plan-format`, `auth`, `security`, and `troubleshooting`.

### Policy

- Playwright CLI is the primary, deterministic execution engine.
- Playwright MCP is used only for discovery, live inspection, selector
  generation, and failure investigation — never as the default runner.
