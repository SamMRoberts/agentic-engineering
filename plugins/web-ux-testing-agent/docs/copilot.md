# GitHub Copilot compatibility

How the **web-ux-testing-agent** plugin maps onto GitHub Copilot and Copilot
custom agents.

## Entry points

- `.github/copilot-instructions.md` — repository-level instructions Copilot reads.
- `.github/agents/*.agent.md` — custom agent definitions.

## Supported features

| Feature | Copilot support | Notes |
| --- | --- | --- |
| Repository instructions | ✅ | `.github/copilot-instructions.md`. |
| Custom agents | ✅ | `.github/agents/web-ux-*.agent.md`. |
| Skills | ⚠️ | Referenced as procedures; Copilot follows the documented steps and runs the scripts directly. |
| MCP tools / Apps | ⚠️ | Depends on the Copilot client. When unavailable, use the runner CLI and the `ui/` fallback. |

## Custom agents

Four custom agents are defined, each with Purpose / Inputs / Outputs / Tools /
Guardrails / Handoff:

- **Web UX Planner** — goal → structured plan.
- **Web UX Runner** — plan → spec → CLI run → artifacts.
- **Web UX Debugger** — investigate failures / unknown UI (Playwright MCP).
- **Web UX Reporter** — summarize results.

## Handoff prompts

- Planner → Runner: "Plan validated. Generate the spec and run it via the
  Playwright CLI with the configured environment."
- Runner → Debugger: "Run failed at step N. Investigate the live page with
  Playwright MCP and classify the cause."
- Debugger → Planner: "Diagnosis: <category>. Apply this minimal repair and
  re-validate before re-running."
- Runner/Debugger → Reporter: "Summarize this run and link the trace,
  screenshots, and video."

## Execution policy

Playwright CLI is the primary runner; Playwright MCP is reserved for discovery
and failure investigation. Require plan validation before execution.

## Differences vs. other hosts

- Copilot uses repository instructions + `.github/agents/`, while Codex uses
  `AGENTS.md` and Claude uses `CLAUDE.md`.
- If your Copilot client lacks MCP App rendering, run the local UI in `ui/`
  (`docs/mcp-app.md`).
