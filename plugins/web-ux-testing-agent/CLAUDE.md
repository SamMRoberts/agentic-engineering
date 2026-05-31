# CLAUDE.md — Claude / Claude Code guidance

Guidance for Anthropic Claude and Claude Code when working with the
**web-ux-testing-agent** plugin.

## Loading project guidance

Claude Code reads this `CLAUDE.md` automatically when the plugin is in scope.
For the full picture, read `README.md`, the per-skill `skills/*/SKILL.md`, and
the host notes in `docs/claude.md`.

## Execution policy

- **Playwright CLI is the primary runner** for deterministic step-by-step tests.
- **Playwright MCP is for discovery and failure investigation only** — live page
  inspection, selector generation, and debugging. Avoid using MCP to run
  deterministic suites.

## Using skills

Invoke the skills under `skills/` for concrete work:

- `plan-authoring` — turn goals into a valid YAML plan; validate + normalize.
- `playwright-generation` — generate a Playwright spec; resolve selectors.
- `playwright-execution` — run via the CLI; collect artifacts.
- `auth-state` — save/verify Playwright storage state (no secrets in plans).
- `failure-triage` — classify failures and propose minimal repairs (uses MCP).
- `report-generation` — produce a Markdown report and a concise summary.

## Using subagents

The plugin defines subagents in `agents/`: `planner` (orchestrator, the only
user-invocable one), `runner`, `debugger`, `reporter`, and `maintainer`. Let the
planner route work; it preserves scope, runner choice, auth policy, and safety
constraints across handoffs.

## MCP tools and Apps

Configure the MCP server from `.mcp.json`. It provides data tools and two MCP
Apps (plan editor, report viewer). In Claude Code, MCP Apps render in the host
UI; if your host does not support MCP Apps, use the local UI fallback in `ui/`
(see `docs/mcp-app.md`). Mutating tools are gated: `save_plan` requires
`confirmedWrite`, `run_plan` requires `confirmedRun`.

## Plugin install notes

This plugin uses the Claude plugin manifest at `.claude-plugin/plugin.json`,
which points at `./agents/`, `./skills/`, and `./.mcp.json`. Install it the same
way as other plugins in this repository's marketplace (`plugins/marketplace.json`).

## Conventions

- Never inline secrets; reference `${ENV_VAR}` only.
- Prefer accessible locators; avoid brittle CSS/XPath.
- Validate plans before execution; distinguish product bugs from test issues.
- Tests: `npm test`.
