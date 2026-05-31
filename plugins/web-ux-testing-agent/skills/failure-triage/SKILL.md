---
name: failure-triage
description: 'Use when a deterministic Playwright run fails or a workflow/selector is unknown, to classify the failure and propose a minimal plan repair. Use for deciding whether a failure is a product bug, selector drift, timing issue, missing auth, changed workflow, environment issue, or invalid plan, and for using Playwright MCP to inspect the live page. Do not use for routine reporting of a passing run; use report-generation instead.'
argument-hint: 'Provide the failing report path and the related plan path.'
user-invocable: true
---

# Failure Triage

Investigate a failed run or unknown UI, classify the cause, and suggest the
smallest plan/selector repair. This is the **only** place Playwright MCP is the
preferred tool.

## When to use

- A deterministic CLI run failed.
- A plan contains steps marked `needs_discovery`.
- The UI may have changed and selectors need re-confirmation on a live page.

## Inputs

- The normalized `report.json` from a failed run and its artifacts.
- The plan that produced the run.
- Optional Playwright MCP access for live inspection.

## Procedure

1. Classify the failure from the report/error text:

   ```bash
   node scripts/analyze-failure.mjs reports/<run-id>/report.json
   ```

   Categories: `product_bug`, `selector_drift`, `timing_issue`, `missing_auth`,
   `changed_workflow`, `environment_issue`, `invalid_plan`.
2. When the cause is unclear or a selector is unknown, use **Playwright MCP** to
   open the live page, read the accessibility tree, and confirm real selectors.
   Do not use MCP to run the deterministic suite.
3. Propose a minimal repair:

   ```bash
   node scripts/suggest-plan-repair.mjs reports/<run-id>/report.json --plan path/to/plan.yaml
   ```

## Output

- A failure diagnosis with category, confidence, and rationale.
- Recommended plan changes and selector updates, citing artifact evidence
  (trace/screenshot/video paths).

## Scripts

- `scripts/analyze-failure.mjs` — classifies failures (wraps
  `lib/failure-triage.mjs`).
- `scripts/suggest-plan-repair.mjs` — proposes minimal plan edits.

## Guardrails

- Distinguish product bugs from test issues; do not "fix" a real product bug by
  weakening the test.
- Keep repairs minimal and re-validate with `plan-authoring` before re-running.
