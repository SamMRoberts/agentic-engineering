---
name: report-generation
description: 'Use when turning a completed Playwright run into a human-readable report, to produce a concise Markdown summary from the JSON report and artifacts. Use for highlighting failed steps, linking traces/screenshots/videos, and distinguishing product bugs from test issues. Do not use for classifying the root cause of a failure; use failure-triage for diagnosis.'
argument-hint: 'Provide the run id or report.json path to summarize.'
user-invocable: true
---

# Report Generation

Produce concise, human-readable reports from a run's JSON report and artifacts.

## When to use

- A run has completed (pass or fail) and needs a readable summary.
- A short status line is needed for chat or a PR comment.

## Inputs

- A normalized `report.json` (from `playwright-execution`).
- Optional diagnosis from `failure-triage` to embed in the summary.

## Procedure

1. Generate a full Markdown report:

   ```bash
   node scripts/generate-report.mjs reports/<run-id>/report.json --out reports/<run-id>/report.md
   ```

2. Generate a one-paragraph status summary for chat/PRs:

   ```bash
   node scripts/summarize-report.mjs reports/<run-id>/report.json
   ```

## Output

- `report.md` with per-step status, failed-step details, and artifact links.
- A short summary string suitable for a PR comment or chat message.

## Scripts

- `scripts/generate-report.mjs` — full Markdown report (wraps `lib/report.mjs`).
- `scripts/summarize-report.mjs` — concise status summary.

## Guardrails

- Link artifacts by relative path; never paste secret-bearing request bodies.
- When a diagnosis is available, state clearly whether the failure looks like a
  product bug or a test issue.
