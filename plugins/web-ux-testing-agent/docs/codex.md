# Codex compatibility

How the **web-ux-testing-agent** plugin maps onto OpenAI Codex.

## Entry points

- `AGENTS.md` — primary project guidance Codex reads.
- `.codex-plugin/plugin.json` — Codex plugin manifest (metadata, agents, skills).
- `.mcp.json` — MCP server declaration.

## Supported features

| Feature | Codex support | Notes |
| --- | --- | --- |
| Project guidance (`AGENTS.md`) | ✅ | Read automatically. |
| Skills (`skills/*/SKILL.md`) | ✅ | Trigger-oriented descriptions; user-invocable. |
| Subagents (`agents/*.agent.md`) | ✅ | Planner is the user-invocable orchestrator. |
| MCP tools | ✅ | From `.mcp.json` (stdio). |
| MCP Apps (plan editor / report viewer) | ⚠️ | Depends on the Codex client build. If unavailable, use the local UI in `ui/`. |

## Recommended workflow

1. Ask the **planner** to convert your workflow into a plan.
2. Ask the **runner** to generate and run the Playwright CLI test.
3. If it fails, ask the **debugger** to investigate with Playwright MCP.
4. Ask the **reporter** to summarize.

## MCP server

```json
{
  "mcpServers": {
    "web-ux-testing-agent": {
      "command": "npx",
      "args": ["-y", "tsx", "mcp/src/server.ts", "--stdio"]
    }
  }
}
```

Set `WEB_UX_WORKSPACE`, `WEB_UX_PLANS_DIR`, and `WEB_UX_REPORTS_DIR` in the
server `env` if your plans/reports live outside the defaults.

## Differences vs. other hosts

- Codex uses `AGENTS.md`; Claude uses `CLAUDE.md`; Copilot uses
  `.github/copilot-instructions.md`. The guidance content is equivalent.
- MCP App rendering is host-dependent; the `ui/` React app is the universal
  fallback.
