---
name: plan-authoring
description: 'Use when turning natural-language web UX workflows into a structured YAML test plan, or when refining, normalizing, or validating an existing plan against test-plan.schema.json. Use for converting step lists ("go to URL, click menu, add new page, verify") into actions, assertions, preconditions, auth requirements, and cleanup steps. Do not use for generating Playwright spec code; use playwright-generation instead.'
argument-hint: 'Describe the app, base URL, auth strategy, and the ordered workflow steps to capture.'
user-invocable: true
---

# Plan Authoring

Convert a user goal or step list into a valid YAML test plan that matches
`schemas/test-plan.schema.json`, then validate and normalize it.

## When to use

- A user describes a workflow in prose or a numbered list.
- An existing plan needs new steps, assertions, or cleanup.
- A plan must be validated or normalized before generation/execution.

## Inputs

Collect or infer (mark `unknown` and ask when it affects safety):

- Application name and base URL (use `${WEB_UX_BASE_URL}` indirection).
- Whether auth is required and the auth strategy (storage state vs. login steps).
- The ordered workflow steps.
- Success criteria (what proves the workflow worked).
- Destructive-action / cleanup policy.

## Procedure

1. Map each natural-language step to a structured action: `navigate`, `click`,
   `fill`, `select`, `press`, `upload`, `wait_for`, `assert_text`,
   `assert_value`, `assert_url`, `assert_visible`.
2. Prefer accessible targets (`role` + `name`, `label`, `text`, `test_id`).
   When a selector is not obvious, set `needs_discovery: true` rather than
   guessing a brittle CSS/XPath selector.
3. Add at least one assertion that encodes the success criteria.
4. Add `preconditions` (auth, seed data) and `cleanup` steps when the workflow
   creates or mutates data.
5. Never inline secrets. Reference credentials via `${ENV_VAR}` only.
6. Validate and normalize:

   ```bash
   node scripts/validate-plan.mjs path/to/plan.yaml
   node scripts/normalize-plan.mjs path/to/plan.yaml --write
   ```

## Output

- A YAML plan that passes `validate-plan.mjs` (schema + secret-hygiene lint).
- A short list of any steps marked `needs_discovery` to hand to the debugger.

## Scripts

- `scripts/validate-plan.mjs` — schema + semantic validation (wraps
  `lib/plan-validator.mjs`).
- `scripts/normalize-plan.mjs` — fills defaults, stable ordering, canonical
  shape (wraps `lib/plan-normalizer.mjs`).

## Guardrails

- Prefer a useful draft over blocking; ask clarifying questions only when base
  URL, auth handling, destructive policy, or in-scope workflows are missing.
- The authoritative validator is `lib/plan-validator.mjs`. Do not hand-edit a
  plan into a shape the validator rejects.
