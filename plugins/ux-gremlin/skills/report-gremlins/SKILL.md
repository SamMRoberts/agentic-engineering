---
name: report-gremlins
description: Render UX Gremlin reports and optionally gate on severity thresholds.
argument-hint: "Provide the results path and any severity threshold to enforce"
user-invocable: true
---

# Report Gremlins

## Purpose

Use this skill to turn plan or run results into human-readable and machine-readable artifacts for reviewers and CI.

## When to Use

- Results have been ingested and you need reports or gating.
- The user asks to summarize results or enforce a severity threshold.

## When Not to Use

- The task is to create or validate the plan.
- No plan or results artifact exists yet.

## Required Inputs

- A plan path and optional results path.
- Optional `--fail-on <severity>` gate threshold.

## Output Artifacts

- `.agent/reports/ux-gremlin/report.md`.
- `.agent/reports/ux-gremlin/report.json`.
- `.agent/reports/ux-gremlin/report.html`.
- `.agent/reports/ux-gremlin/report.junit.xml`.
- `.agent/reports/ux-gremlin/report.pr.md`.

## CLI Entry Point

`node skills/report-gremlins/scripts/report-gremlins.mjs`

## Workflow Notes

- Use `gate` or `report --fail-on` when the workflow must block on severity.
- Follow with `triage-failures` or `regression-guard` for deeper analysis.
