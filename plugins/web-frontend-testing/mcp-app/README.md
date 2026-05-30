# Web Frontend Report Viewer (MCP App)

An MCP App that opens an interactive triage viewer for executive reports produced by the [`web-frontend-testing`](../) plugin. The viewer loads `test-plan.yaml` plus every finding under `findings/`, shows run metadata, severity-filterable counts, and expandable per-finding details. It also exposes a button to open the static `executive-report.html` in the user's browser and a validation-backed plan editor.

Only useful in hosts that render MCP App resources (e.g. Claude Desktop). For other hosts, the tool returns a plain-text summary as fallback `content`.

## Install

From this directory:

```bash
npm install
```

## Run

Build the bundled HTML and start the server.

```bash
# HTTP transport (recommended for testing with basic-host)
npm run start

# stdio transport (for hosts that prefer it)
npm run start:stdio
```

Run the app's focused tests:

```bash
npm test
```

## Use

Invoke the `view_executive_report` tool with the path to a report directory:

```json
{
  "name": "view_executive_report",
  "arguments": {
    "reportDir": "./reports/web-frontend-testing/2026-05-30T10-00-00/"
  }
}
```

The tool reads:

- `test-plan.yaml` — run metadata (target, stage, runner, scenarios).
- `findings/*.yaml` — every finding emitted by the execution agent.
- `executive-report.html` / `engineering-report.md` — paths only; surfaced as links in the UI.

The app also exposes `update_test_plan` for validation-backed edits:

```json
{
  "name": "update_test_plan",
  "arguments": {
    "planPath": "./reports/web-frontend-testing/2026-05-30T10-00-00/test-plan.yaml",
    "planYaml": "plan_version: 1\n...",
    "dryRun": true
  }
}
```

Use `dryRun: true` to validate without writing. A non-dry write requires explicit `confirmedWrite: true` after user confirmation and still refuses to write when validation returns errors.

## Register with a host

### Claude Desktop / Claude Code (stdio)

Add to your MCP servers config (e.g. `claude_desktop_config.json` or this plugin's `.mcp.json`):

```jsonc
{
  "mcpServers": {
    "web-frontend-report-viewer": {
      "command": "npx",
      "args": [
        "-y",
        "--prefix",
        "/absolute/path/to/plugins/web-frontend-testing/mcp-app",
        "run",
        "start:stdio"
      ]
    }
  }
}
```

### Local HTTP / basic-host

```bash
npm run dev   # vite watch + tsx --watch main.ts
# In a second terminal:
cd /tmp/mcp-ext-apps/examples/basic-host
SERVERS='["http://localhost:3101/mcp"]' npm run start
# Open http://localhost:8080
```

## Notes

- The app makes **no network requests** from inside its UI, so no CSP block is required.
- All findings rendering uses HTML-escaped text; no `innerHTML` of user-controlled markup.
- Theme, fonts, and host style variables are applied from `McpUiHostContext` when provided.
- Plan saves call `update_test_plan` with explicit confirmation and are refused when validation fails.
