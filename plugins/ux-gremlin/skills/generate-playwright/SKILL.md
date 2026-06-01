---
name: generate-playwright
description: Generate `.spec.ts` output from a validated UX Gremlin plan.
argument-hint: "Provide the validated plan path and any known selector or recipe details"
user-invocable: true
---

# Generate Playwright

## Purpose

Use this skill to emit the starter Playwright spec that mirrors the baseline plus each gremlin scenario.

## When to Use

- The plan has already passed validation.
- The user wants a Playwright test file or starter spec.

## When Not to Use

- The plan has not been validated yet.
- The task is selector cleanup, execution, or reporting only.

## Required Inputs

- A validated UX Gremlin plan.
- Optional `playwright_steps` recipes or selector guidance.

## Output Artifacts

- `.agent/generated/ux-gremlin.spec.ts`.
- Scenario annotations that downstream execution and reporting can ingest.

## CLI Entry Point

`node skills/generate-playwright/scripts/generate-playwright.mjs`

## Workflow Notes

- Follow with `selector-discovery` if the generated spec still contains placeholders.
- Run `execute-tests` after the generated spec is fully implemented.
