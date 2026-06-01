---
name: regression-guard
description: Compare the latest results against historical baselines and highlight regressions or trend shifts.
argument-hint: "Provide the latest results plus any baseline or prior report artifacts to compare against"
user-invocable: true
---

# Regression Guard

## Purpose

Use this skill to identify what changed since the last run and whether the UX risk trend is worsening.

## When to Use

- Historical results exist and you need a regression summary.
- The user asks what changed since the last run or wants trend tracking.

## When Not to Use

- There is only a single isolated run with no baseline to compare against.
- The task is still in planning or generation.

## Required Inputs

- Latest results and any prior result/report artifacts.
- Context about expected behavior changes in the app.

## Output Artifacts

- A regression summary in `.agent/reports/ux-gremlin/regression.md`.
- Trend notes for severity shifts, new failures, and recovered scenarios.

## CLI Entry Point

`node skills/regression-guard/scripts/regression-guard.mjs`

## Workflow Notes

- Use after reporting when historical context matters.
- Escalate newly introduced high-severity issues quickly.
