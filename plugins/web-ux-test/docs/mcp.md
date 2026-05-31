# MCP server

`mcp-workflow/` is a thin MCP server exposing the high-level web-ux-test workflow. It does not duplicate business logic — every tool delegates to the plugin's `lib/`.

## Transport

Stdio only in MVP:

```bash
cd mcp-workflow
npm install
npm run start:stdio
```

## Tools

All tools return a structured envelope:

```json
{
  "ok": true,
  "state": "plan_validated",
  "nextAllowedActions": ["auth setup", "selectors discover"],
  "artifacts": { "runs": [], "reports": [], "repairs": [] },
  "result": { /* the underlying CLI handler result */ }
}
```

| Tool | Input | Notes |
| --- | --- | --- |
| `init_project` | (none) | Equivalent to `web-ux-test init`. |
| `create_test_plan` | `{ planPath: string }` | Records an existing plan YAML. |
| `validate_test_plan` | `{ planPath: string }` | Schema-validates and best-effort advances workflow. |
| `get_workflow_state` | (none) | Returns the current phase and metadata. |
| `run_next_workflow_step` | (none) | Advances by one phase for no-payload events. |
| `run_test_phase` | (none) | Executes Playwright; advances to `test_executed`. |
| `classify_latest_failure` | (none) | Assigns a category to the latest failing run. |
| `propose_repair` | `{ proposalPath: string }` | Validates and records a repair proposal. |
| `approve_repair` | (none) | Approves the pending proposal. |
| `apply_approved_repair` | (none) | Applies with backup. |
| `generate_report` | (none) | Writes Markdown + HTML reports. |
| `run_phase` | `{ targetPhase: string }` | Advances into a specific no-payload phase. |

## Safety

- Each tool is single-step. There is no "do everything" macro tool.
- The server inherits the file-edit safety of the underlying CLI: repair targets outside the allowlist are rejected; auth writes pass through the `deny-auth-credentials` hook.
- The server uses MCP stdio with no additional auth — treat the local socket as trusted in the same way you treat a CLI.

## Tests

```bash
cd mcp-workflow
npm test
```

Exercises the server through `InMemoryTransport` and verifies tool listing, error cases, and end-to-end state advancement.
