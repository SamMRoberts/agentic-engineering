---
name: gremlin-execute-tests
description: Run Playwright, check execution readiness, and ingest results into the UX Gremlin result artifact.
argument-hint: "Provide the spec path and, after execution, the Playwright JSON report path to ingest"
user-invocable: true
---

# Execute Tests

## Purpose

Use this skill to enforce execution gates, ingest Playwright JSON results, and prepare reporting artifacts.

## When to Use

- A generated spec exists and is ready to run.
- A Playwright JSON report already exists and needs ingestion.

## When Not to Use

- The plan has not yet been validated or the spec is still incomplete.
- The task is only to summarize or gate existing results.

## Required Inputs

- A runnable `.agent/generated/ux-gremlin.spec.ts`.
- Optional `--input <playwright-report.json>` and `--axe <axe-results.json>` for ingestion.

## Output Artifacts

- Execution readiness feedback from `workflow-status --phase execute`.
- `.agent/session/ux-gremlin-results.json` after ingestion.

## CLI Entry Point

`node skills/gremlin-execute-tests/scripts/execute-tests.mjs`

## Workflow Notes

- Without `--input`, the CLI entry point performs the execute gate and prints the next Playwright command to run.
- After ingestion, hand off to `report-gremlins`.
