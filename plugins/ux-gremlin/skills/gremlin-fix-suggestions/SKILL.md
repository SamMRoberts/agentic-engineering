---
name: gremlin-fix-suggestions
description: Suggest likely application-code fixes for failing gremlin scenarios.
argument-hint: "Provide the failing scenario ids, observed bug indicators, and the affected route or component"
user-invocable: true
---

# Fix Suggestions

## Purpose

Use this skill to translate failing UX Gremlin findings into likely remediation ideas for the application itself.

## When to Use

- You already have a confirmed or likely product bug from a gremlin run.
- The user asks what they should fix or how the app could recover better.

## When Not to Use

- The failure still needs triage.
- The task is only to generate or execute tests.

## Required Inputs

- Scenario ids, error symptoms, and route/component context.
- Any logs, screenshots, traces, or recovery failures.

## Output Artifacts

- Suggested remediation notes in `.agent/session/ux-gremlin-fix-suggestions.md`.
- Actionable bug-fix hypotheses for engineering follow-up.

## CLI Entry Point

`node skills/gremlin-fix-suggestions/scripts/fix-suggestions.mjs`

## Workflow Notes

- Prefer application-code or product-behavior fixes over test-only workarounds.
- Pair with `triage-failures` when confidence is low.
