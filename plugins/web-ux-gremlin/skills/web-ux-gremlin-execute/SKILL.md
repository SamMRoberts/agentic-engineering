---
name: web-ux-gremlin-execute
description: Use after the execution gate passes to run the implemented Web UX Gremlin Playwright spec in CLI or MCP mode and capture execution artifacts.
argument-hint: "Execution mode, plan path, run-report path, and optional MCP state/command"
user-invocable: false
---

# Web UX Gremlin Execute

## Scope

Use this private skill to run the implemented spec and produce the raw execution artifacts required for ingest.

Stop when the Playwright JSON report exists and the ingest gate can pass.

## Required Inputs

- execution-ready spec
- plan path
- chosen mode: `playwright-cli` or `playwright-mcp`
- any required MCP command/state overrides

## Procedure

1. Confirm `workflow-status --phase execute` already passes.
2. Run `node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs run --mode ...`.
3. Capture the raw JSON report path and any stdout/stderr artifacts.
4. Run `node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase ingest --input <playwright-json>` to confirm ingest readiness.
5. If the gate fails, repair the upstream execution artifact and rerun the same gate.

## Validation

Run:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase ingest --input <playwright-json>
```

## Output

Report:

- execution mode used
- run-report path
- whether execution succeeded
- any blocked scenarios or run-level failures

## Safety Rules

- Do not execute before the spec passes the execution gate.
- Do not switch execution mode silently.
- Do not treat a missing JSON report as a successful run.
