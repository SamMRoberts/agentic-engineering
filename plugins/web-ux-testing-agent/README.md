# Web UX Testing Agent

A cross-agent plugin for **OpenAI Codex**, **Anthropic Claude / Claude Code**, and
**GitHub Copilot** that helps you define, edit, execute, debug, and review
step-by-step Playwright-based web UX validation plans.

It turns a workflow like:

1. Go to URL
2. Click a menu item
3. Select a tab
4. Click **Add New**
5. In the popup, click **Page**
6. Fill required fields, click **Next**
7. Confirm creation
8. Wait for completion
9. Verify success

…into a **structured YAML test plan**, **generated Playwright test code**,
**repeatable CLI execution**, and a **readable test report**.

## Execution model

- **Playwright CLI is the primary execution engine** for deterministic,
  repeatable step-by-step tests.
- **Playwright MCP is used only** for discovering unknown workflows, inspecting
  live pages, generating selectors, debugging failed steps, investigating UI
  changes, and recommending plan repairs. It is **not** the default runner.

## Components

| Area | Path | Purpose |
| --- | --- | --- |
| Core logic | `lib/*.mjs` | Source-of-truth validator, generator, report, triage |
| Schemas | `schemas/*.json` | Plan, step, report, and environment contracts |
| Skills | `skills/*/SKILL.md` | Authoring, generation, execution, auth, triage, reporting |
| Subagents | `agents/*.agent.md` | planner, runner, debugger, reporter, maintainer |
| Runner | `runner/` | Playwright CLI driver (validate / generate / run / report) |
| MCP server | `mcp/` | 8 data tools + plan-editor & report-viewer MCP Apps |
| Local UI | `ui/` | React fallback for hosts without MCP Apps |
| Docs | `docs/*.md` | Per-host compatibility + format/auth/security guides |

## Quick start

```bash
# from this plugin directory
npm install
npm test                      # runs the core lib tests (node --test)

# validate and generate from an example plan
npm run validate:plan examples/create-page.plan.yaml
npm run generate:test -- --plan examples/create-page.plan.yaml --out runner/tests

# run via the Playwright CLI
cd runner && npm install && npx playwright install chromium
WEB_UX_BASE_URL=https://example.test npx playwright test
```

## Subagents

- **Web UX Planner** — goal → structured YAML plan (user-invocable orchestrator).
- **Web UX Runner** — plan → Playwright spec → CLI run → artifacts.
- **Web UX Debugger** — investigate failures / unknown UI with Playwright MCP.
- **Web UX Reporter** — summarize results for humans.
- **Web UX Maintainer** — persist/repair plans and keep structure healthy.

## Host compatibility

- **Codex** — see [`AGENTS.md`](AGENTS.md) and [`docs/codex.md`](docs/codex.md).
- **Claude / Claude Code** — see [`CLAUDE.md`](CLAUDE.md) and
  [`docs/claude.md`](docs/claude.md).
- **GitHub Copilot** — see
  [`.github/copilot-instructions.md`](.github/copilot-instructions.md) and
  [`docs/copilot.md`](docs/copilot.md).

Feature differences between hosts (MCP Apps, custom agents, skills) are
documented explicitly in `docs/` rather than papered over.

## Security

Secrets are never inlined into plans or generated specs — reference `${ENV_VAR}`
only. Storage-state/auth files are git-ignored. See
[`docs/security.md`](docs/security.md).

## License

MIT — see [`LICENSE`](LICENSE).
