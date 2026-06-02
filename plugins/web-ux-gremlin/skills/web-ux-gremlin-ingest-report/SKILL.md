---
name: web-ux-gremlin-ingest-report
description: Use after execution to ingest Playwright JSON results, export Web UX Gremlin report artifacts, and apply CI severity gating when requested.
argument-hint: "Playwright JSON report path, results path, report output directory, and optional fail-on severity"
user-invocable: false
---

# Web UX Gremlin Ingest Report

## Scope

Use this private skill to turn execution artifacts into normalized results and final report outputs.

Stop when results exist, report artifacts are written, and any requested severity gate has completed.

## Required Inputs

- Playwright JSON report path
- plan path
- optional results output path
- optional report output directory
- optional `fail-on` threshold

## Procedure

1. Run `node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase ingest --input <playwright-json>`.
2. Run `ingest` to create the normalized results file.
3. Run `node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase report --results <results-path>`.
4. Run `report`.
5. Run `gate` or `report --fail-on <severity>` when CI gating is requested.
6. If a gate fails, repair the reported upstream artifact and rerun the same gate before continuing.

## Validation

Run:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase ingest --input <playwright-json>
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase report --results <results-path>
```

## Output

Report:

- results path
- report artifact paths
- verdict / highest severity
- gate result when requested

## Safety Rules

- Do not skip ingest when the report depends on execution results.
- Do not claim report completion when results validation still fails.
- Do not hide a failing severity gate.
