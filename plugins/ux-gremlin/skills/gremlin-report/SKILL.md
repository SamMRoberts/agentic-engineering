---
name: gremlin-report
description: Render UX Gremlin reports, summarize failures, recommend fixes, compare trends, explain scenarios, and optionally gate on severity thresholds.
argument-hint: "Provide the results path and any severity threshold to enforce"
user-invocable: true
---

# Report Gremlins

## Purpose

Use this skill to turn plan or run results into human-readable and machine-readable artifacts for reviewers and CI.
It now owns former failure triage, fix suggestion, regression guard, scenario explanation, and CI gate guidance entrypoints.

## When to Use

- Results have been ingested and you need reports or gating.
- The user asks to summarize results or enforce a severity threshold.
- The user asks why a scenario failed, what to fix, what changed since last run, why a scenario matters, or how to gate CI on findings.

## When Not to Use

- The task is to create or validate the plan.
- No plan or results artifact exists yet.

## Required Inputs

- A plan path and optional results path.
- Optional `--fail-on <severity>` gate threshold.
- Optional failing scenario ids, run metadata, trend/history context, or product impact notes.

## Output Artifacts

- `.agent/reports/ux-gremlin/report.md`.
- `.agent/reports/ux-gremlin/report.json`.
- `.agent/reports/ux-gremlin/report.html`.
- `.agent/reports/ux-gremlin/report.junit.xml`.
- `.agent/reports/ux-gremlin/report.pr.md`.

## CLI Entry Point

`node skills/gremlin-report/scripts/report-gremlins.mjs`

## Workflow Notes

- Use `gate` or `report --fail-on` when the workflow must block on severity.
- Treat failures as product bugs only when evidence supports that; otherwise label environment, flaky, or needs-review risk clearly.
- Use report history and Top Issues output for regression summaries and recommended actions.
