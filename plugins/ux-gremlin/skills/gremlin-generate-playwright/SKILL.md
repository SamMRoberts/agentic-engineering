---
name: gremlin-generate-playwright
description: Generate `.spec.ts` output from a validated UX Gremlin plan and resolve recipe or locator guidance before execution.
argument-hint: "Provide the validated plan path and any known selector or recipe details"
user-invocable: true
---

# Generate Playwright

## Purpose

Use this skill to emit the starter Playwright spec that mirrors the baseline plus each gremlin scenario.
It now owns the former selector-discovery entrypoint for converting known locators or `playwright_steps` recipes into runnable generated code.

## When to Use

- The plan has already passed validation.
- The user wants a Playwright test file or starter spec.
- The user needs generated TODO placeholders reduced with known role, label, test id, or recipe guidance.

## When Not to Use

- The plan has not been validated yet.
- The task is execution readiness, Playwright run ingestion, or reporting only.

## Required Inputs

- A validated UX Gremlin plan.
- Optional `playwright_steps` recipes or selector guidance.
- Route/component context for replacing generated placeholders with accessible locators.

## Output Artifacts

- `.agent/generated/ux-gremlin.spec.ts`.
- Scenario annotations that downstream execution and reporting can ingest.

## CLI Entry Point

`node skills/gremlin-generate-playwright/scripts/generate-playwright.mjs`

## Workflow Notes

- Prefer `playwright_steps` recipes and accessible role/label/test id locators over brittle CSS.
- Follow with `execute-tests` after generated placeholders and active `requireImplementation(...)` guards are removed.
- Run `execute-tests` after the generated spec is fully implemented.
