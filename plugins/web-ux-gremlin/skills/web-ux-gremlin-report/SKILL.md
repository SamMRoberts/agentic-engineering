---
name: web-ux-gremlin-report
description: "Private helper for web-ux-gremlin. Use only to produce Markdown and optional self-contained HTML reports for completed or blocked UX bug-hunt Playwright runs."
argument-hint: "Run contract, plan path, test files, commands run, results, UX findings, healed failures, blockers, requested report format"
user-invocable: false
---

# Web UX Gremlin Report

Write the final run report after generation, execution, healing, or classification.

## Procedure

1. Save Markdown reports under `specs/reports/web-ux-gremlin-report-<YYYYMMDD-HHMM>.md` using UTC time.
2. Never overwrite an existing report; append `-2`, `-3`, and so on.
3. Include plan path, test files, commands run, pass/fail status, UX findings by severity, healed failures, blockers, gaps, and the exact run contract.
4. Redact secrets, cookies, tokens, authorization headers, connection strings, private data, and production identifiers.
5. If `report=html` or `report=both`, follow `../web-ux-gremlin/checklists/report-html.md`; Markdown remains the source of truth.

## Output

Return report paths, validation performed, findings count, blockers, and residual risk.
