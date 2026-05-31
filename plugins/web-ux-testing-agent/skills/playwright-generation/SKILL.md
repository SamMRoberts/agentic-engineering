---
name: playwright-generation
description: 'Use when converting a validated YAML test plan into a deterministic Playwright Test spec file, or when resolving accessible locators for plan steps. Use for generating spec files that wrap every plan step in test.step() and prefer getByRole/getByLabel/getByText/getByTestId. Do not use for running tests (use playwright-execution) or for live selector discovery on an unknown page (use failure-triage with Playwright MCP).'
argument-hint: 'Provide the validated plan path and the output spec path.'
user-invocable: true
---

# Playwright Generation

Generate a Playwright Test spec from a validated plan, using accessible
locators and one `test.step()` per logical plan step.

## When to use

- A plan has passed validation and is ready to become deterministic test code.
- Selectors need to be resolved from structured `target` objects into Playwright
  locator expressions.

## Inputs

- A validated YAML plan (see `plan-authoring`).
- Output spec path (defaults under the runner test directory).

## Procedure

1. Resolve each step `target` to an accessible locator:

   ```bash
   node scripts/resolve-selectors.mjs path/to/plan.yaml
   ```

   Priority: `getByRole` → `getByLabel` → `getByText` → `getByTestId`. Only fall
   back to CSS/XPath when a step explicitly requires it.
2. Generate the spec (`--out` is the output directory):

   ```bash
   node scripts/generate-playwright-test.mjs --plan path/to/plan.yaml --out runner/tests
   ```

3. Confirm every logical step is wrapped in `test.step()` and that
   `${ENV_VAR}` references are emitted as `process.env.VAR`, never literals.

## Output

- A `*.spec.ts` file consumed by the runner's `playwright.config.ts`.
- Traces, screenshots, and video are enabled on failure by the runner config.

## Scripts

- `scripts/resolve-selectors.mjs` — turns `target` objects into locator
  expressions (wraps `lib/selectors.mjs`).
- `scripts/generate-playwright-test.mjs` — emits the spec (wraps
  `lib/test-generator.mjs`).

## Guardrails

- Never write secret values into generated code; the generator interpolates
  environment variables instead.
- Do not weaken locators to brittle selectors to make a step pass; mark the step
  for discovery instead.
