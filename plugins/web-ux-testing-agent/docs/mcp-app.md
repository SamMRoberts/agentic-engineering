# MCP App & local UI fallback

The plugin ships two MCP Apps and a local web UI that provides the same
experience on hosts without MCP App support.

## MCP Apps

Declared in `.app.json` and registered by the MCP server (`mcp/src/server.ts`):

| App | Entry | Purpose |
| --- | --- | --- |
| Plan editor | `mcp/src/apps/plan-editor/index.html` | View and edit test plans, validate, save. |
| Report viewer | `mcp/src/apps/report-viewer/index.html` | View a run's steps, failures, artifacts, and diagnosis. |

The apps are dependency-free single-file HTML. They detect the MCP host bridge
(`window.mcpApp` / `window.openai` / `window.mcp`) and call the server's tools
(`get_plan`, `save_plan`, `validate_plan`, `get_report`). When opened standalone
they degrade gracefully so they remain previewable.

### Host support

| Host | MCP App rendering |
| --- | --- |
| Claude / Claude Code | ✅ Supported |
| Codex | ⚠️ Client-dependent |
| GitHub Copilot | ⚠️ Client-dependent |

When a host does not render MCP Apps, use the local UI fallback below.

## Local UI fallback (`ui/`)

A small Vite + React app with three pages:

- `PlanEditor.tsx` — list/edit/validate/save plans.
- `ReportViewer.tsx` — view a run's steps, failures, artifacts, diagnosis.
- `TestRunHistory.tsx` — browse past runs and open their reports.

```bash
cd ui
npm install
npm run dev      # http://localhost:5273
```

The UI talks to an optional backend at `/api` that mirrors the MCP tool surface
(`/plans`, `/plans/:id`, `/validate`, `/reports`, `/reports/:run`). With no
backend it runs against bundled sample data so it is always explorable. The
authoritative validation/generation logic lives in `lib/*.mjs`; any backend
should wrap those modules rather than reimplement them.

## Why two surfaces?

MCP Apps give a native in-host experience where supported; the React app
guarantees a usable editor/report viewer everywhere else. Both are thin views
over the same core logic and schemas.
