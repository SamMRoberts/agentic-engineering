---
name: convert-web-frontend-plan-to-playwright-tests
description: 'Use when converting validated web-frontend test-plan.yaml scenarios into deterministic Playwright CLI specs. Use for generating one .spec.ts per regression-eligible scenario, applying the locator strategy order (role > label > text > test_id > placeholder > css), and producing a runnable test directory. Do not use for Playwright MCP execution, broad plan creation, or running specs (use run-playwright-cli-frontend-test for execution).'
argument-hint: 'Provide the validated plan path, optional --out directory (default tests/web-frontend), and the scenario IDs to convert (defaults to all scenarios with convert_to_regression_test: true and executable_steps).'
user-invocable: false
---

# Convert Web Frontend Plan To Playwright Tests

Convert stable scenarios from a validated `test-plan.yaml` into Playwright CLI spec files that can be executed by `run-playwright-cli-frontend-test`.

## When to Use

- The plan validator exited `0` for the supplied plan.
- Scenarios are marked `convert_to_regression_test: true` and include `executable_steps`.
- The user wants generated specs (a) to run as regression tests, or (b) to seed CI runs.

Do **not** use this skill for live MCP exploration, scenario discovery, or to invent executable steps the plan does not contain.

## Required Inputs

- Validated plan path.
- Output directory (default: `tests/web-frontend`).
- Optional: scenario IDs to convert. When omitted, every scenario with `convert_to_regression_test: true` and at least one `executable_step` is converted.

If the plan has validation errors, refuse to convert. Re-run the plan validator first.

## Procedure

1. Confirm the plan validator already exited `0` for the supplied plan (the upstream plan agent or `web-frontend-testing-plan` runs `generate-web-frontend-test-plan`'s validator). If the validation result is unknown, ask the orchestrator to re-run the plan stage; do not invoke another skill's scripts directly.
2. Run the deterministic generator:

   ```bash
   node skills/convert-web-frontend-plan-to-playwright-tests/scripts/generate-playwright-tests.mjs --plan <plan-path> [--out tests/web-frontend]
   ```

3. The generator re-runs the shared plan validator internally and refuses to emit specs when the plan has validation errors.
4. Each emitted file is `<scenario-id>.spec.ts` under `--out`. The spec uses `@playwright/test`, imports `test` and `expect`, and compiles `executable_steps` into deterministic Playwright calls.
5. Inspect the generated specs. Add any project-specific imports (fixtures, storage state, base URL) in a sibling Playwright config rather than editing generated specs.
6. Run a sanity check with `npx playwright test <out-dir> --list` from the consuming repo to confirm test discovery.

## Locator Rules

The generator translates `locator.strategy` to Playwright locators in this fixed order:

- `role` → `page.getByRole(role, { name })`
- `label` → `page.getByLabel(value)`
- `text` → `page.getByText(value)`
- `test_id` → `page.getByTestId(value)`
- `placeholder` → `page.getByPlaceholder(value)`
- `css` → `page.locator(value)`

Plans should use `role`, `label`, `text`, or `test_id` whenever possible. `css` is a last resort.

## Supported Executable Step Actions

`navigate`, `click`, `fill`, `select`, `press`, `assert_visible`, `assert_text`, `assert_url`, `screenshot`. Unsupported actions cause the generator to exit non-zero with a clear error.

## Boundaries

- Do not convert scenarios without `executable_steps`. Exploratory prose steps belong in MCP execution, not CLI.
- Do not invent locators, values, or assertions the plan does not declare.
- Do not emit fixtures, helpers, or page-object code automatically; keep generated specs focused on the literal scenario.
- Do not include credentials, tokens, or secrets in generated specs. Reference storage-state paths or env vars instead.

## Output

Return:

- `plan_path`
- `out_dir`
- `generated`: `[{ scenario_id, spec_path }]`
- `skipped`: `[{ scenario_id, reason }]`
- `validation_warnings`
- `errors` (when non-zero exit)
- `recommended_next_agent`: `web-frontend-testing-cli-execution` to run the generated specs

## Resources

- [./scripts/generate-playwright-tests.mjs](./scripts/generate-playwright-tests.mjs) — deterministic generator.
- [../../schemas/web-frontend-test-plan.schema.yaml](../../schemas/web-frontend-test-plan.schema.yaml) — the executable_step and locator contracts.
- [../generate-web-frontend-test-plan/SKILL.md](../generate-web-frontend-test-plan/SKILL.md) — upstream plan authoring rules.
