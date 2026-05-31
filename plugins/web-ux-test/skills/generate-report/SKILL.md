---
name: generate-report
description: "Use after a test run completes (passed or failed). Use for producing the Markdown and HTML reports that summarize a run's status, steps, failure, and artifacts."
argument-hint: "<no input — reads workflow state>"
user-invocable: false
---

# Generate report

## Scope

Render `.web-ux-testing/reports/<runId>.md` and `<runId>.html` from the latest run record at `.web-ux-testing/runs/<runId>/run.json`. Advances workflow to `report_generated`.

## Procedure

```bash
web-ux-test report generate
```

Or:

```bash
node skills/generate-report/scripts/generate.mjs
```

## Output

- Markdown report path (printed to stdout).
- HTML report path (printed to stdout).
- Workflow state updated: artifacts.reports gains the markdown path.

## Validation

- Reports are snapshot-tested under `test/reports/reports.test.mjs`.
- The HTML renderer escapes all user-controlled content.

## Safety

- Never edit a report by hand; regenerate from the run record if needed.
