# Claude / Claude Code compatibility

How the **web-ux-testing-agent** plugin maps onto Anthropic Claude and Claude Code.

## Entry points

- `CLAUDE.md` — primary project guidance Claude reads.
- `.claude-plugin/plugin.json` — Claude plugin manifest (agents, skills, MCP).
- `.mcp.json` — MCP server declaration referenced by the manifest.

## Supported features

| Feature | Claude support | Notes |
| --- | --- | --- |
| Project guidance (`CLAUDE.md`) | ✅ | Read automatically in Claude Code. |
| Skills (`skills/*/SKILL.md`) | ✅ | Invoked by name or trigger. |
| Subagents (`agents/*.agent.md`) | ✅ | Planner orchestrates; others are private. |
| MCP tools | ✅ | From `.mcp.json` (stdio). |
| MCP Apps | ✅ | Plan editor and report viewer render in Claude Code's UI. |
| Plugin install / marketplace | ✅ | Via `plugins/marketplace.json`. |

## Recommended workflow

1. Load project guidance (automatic via `CLAUDE.md`).
2. Use `plan-authoring` to draft and validate a plan.
3. Use `playwright-generation` + `playwright-execution` to generate and run the
   CLI test.
4. On failure, use `failure-triage` (Playwright MCP) to diagnose.
5. Use `report-generation` to summarize.

## Avoid overusing MCP

Do not run deterministic suites through Playwright MCP — the CLI is the runner.
Reserve MCP for discovery, live inspection, selector generation, and failure
investigation.

## Install notes

The Claude manifest points at `./agents/`, `./skills/`, and `./.mcp.json`.
Installing from the repository marketplace wires all three up together.

## Differences vs. other hosts

- Claude has first-class MCP App support; on hosts without it, use the `ui/`
  React fallback (`docs/mcp-app.md`).
- Guidance lives in `CLAUDE.md` (vs. `AGENTS.md` for Codex,
  `.github/copilot-instructions.md` for Copilot).
