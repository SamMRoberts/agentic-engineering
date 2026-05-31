# AGENTS.md — Codex guidance

Project guidance for OpenAI Codex when working with the **web-ux-testing-agent**
plugin. This file is the Codex entry point; see also `README.md` and `docs/`.

## What this project does

Turns step-by-step web UX workflows into structured YAML test plans, generated
Playwright tests, repeatable CLI execution, and readable reports.

## Execution policy (important)

- **Prefer the Playwright CLI** for executing deterministic, step-by-step tests.
- **Prefer Playwright MCP** only for live exploration, selector discovery, and
  failure investigation. Do not use MCP as the default runner.

## Subagents and when to use them

- **planner** (`agents/planner.agent.md`) — use to create or refine test plans.
  This is the user-invocable orchestrator.
- **runner** (`agents/runner.agent.md`) — use to generate and run Playwright CLI
  tests and collect artifacts.
- **debugger** (`agents/debugger.agent.md`) — use **only** when a deterministic
  run fails or the UI is unknown; it prefers Playwright MCP for live inspection.
- **reporter** (`agents/reporter.agent.md`) — use to summarize results.
- **maintainer** (`agents/maintainer.agent.md`) — use to persist/repair plans
  and keep the plan/report corpus and structure healthy.

## Skills

Invoke skills (`skills/*/SKILL.md`) for the concrete work:

- `plan-authoring` — author, validate, normalize plans.
- `playwright-generation` — generate specs, resolve selectors.
- `playwright-execution` — run via CLI, collect artifacts.
- `auth-state` — save/verify Playwright storage state.
- `failure-triage` — classify failures, suggest repairs (uses MCP).
- `report-generation` — Markdown report + concise summary.

## MCP configuration

The MCP server is declared in `.mcp.json` and started with
`npx -y tsx mcp/src/server.ts --stdio`. It exposes read-only tools
(`list_plans`, `get_plan`, `validate_plan`, `list_reports`, `get_report`,
`debug_failure`) and gated mutating tools (`save_plan` requires
`confirmedWrite`, `run_plan` requires `confirmedRun`). It also serves two MCP
Apps: a plan editor and a report viewer. See `docs/mcp-app.md` and
`docs/codex.md`.

## Conventions

- Never inline secrets; reference `${ENV_VAR}` only.
- Prefer accessible locators (`getByRole`/`getByLabel`/`getByText`/`getByTestId`).
- Validate plans before execution. Keep repairs minimal and evidence-based.
- Tests: `npm test` (runs `node --test test/**/*.test.mjs`).
