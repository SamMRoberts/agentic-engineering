---
name: convert-existing
description: Import existing Playwright or Cypress flows and wrap them with gremlin mutations.
argument-hint: "Provide the existing test file, framework, and which flow should be adapted into gremlin coverage"
user-invocable: true
---

# Convert Existing

## Purpose

Use this skill to accelerate adoption when the team already has end-to-end tests that can seed gremlin scenarios.

## When to Use

- The user wants to convert Cypress or existing Playwright coverage into UX Gremlin format.
- There is an established happy-path test that should become the baseline.

## When Not to Use

- No reusable existing test coverage is available.
- The task is only about reporting or triage.

## Required Inputs

- The existing test file or flow outline.
- Framework details and any migration constraints.

## Output Artifacts

- A conversion plan in `.agent/session/ux-gremlin-conversion.md`.
- Updated baseline/plan artifacts ready for validation.

## CLI Entry Point

`node skills/convert-existing/scripts/convert-existing.mjs`

## Workflow Notes

- Keep the original happy path recognizable as the baseline.
- Route to `plan-gremlins` or `generate-playwright` after extracting the flow.
