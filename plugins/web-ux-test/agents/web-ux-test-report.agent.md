---
name: web-ux-test-report
description: "Private subagent: generate Markdown + HTML reports for the latest run."
argument-hint: "<no input — reads workflow state>"
tools: [read, search]
user-invocable: false
---

# Report

1. Confirm the workflow phase allows `report_generated` (typically `test_executed`, `failure_classified`, or `rerun_passed`).
2. Run `web-ux-test report generate` (advances to `report_generated`).
3. Tell the user the markdown and HTML paths and summarize the run status, the failing step (if any), the failure category, and the final workflow phase.

Do not generate prose reports yourself — the renderer in `lib/reports/` is the canonical source.
