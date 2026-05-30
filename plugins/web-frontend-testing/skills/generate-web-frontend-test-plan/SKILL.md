---
name: generate-web-frontend-test-plan
description: 'Use when generating or refining a standardized Playwright MCP test plan for a web frontend. Produces `test-plan.yaml` with scenarios, priorities, safety constraints, and pre-execution validation. Use for: creating a test plan, adding scenarios to an existing plan, marking destructive scenarios, validating a plan before execution. Do not use for: executing scenarios, writing Playwright CLI test files, or producing reports.'
argument-hint: 'Surface inventory, scope summary, auth strategy, runner (default playwright-mcp), safety constraints, report directory, and any user-requested scenario overrides.'
user-invocable: false
---

# Generate Web Frontend Test Plan

Translate a Surface Inventory + requirements brief into a standardized `test-plan.yaml` and validate it before any execution.

## When to Use

- Requirements gate returned `decision: allow` with a Surface Inventory.
- The user asks to "create a test plan", "add scenarios", or "refresh the plan".
- A previously generated plan failed validation and needs targeted fixes.

## Inputs (required)

- Surface inventory (from `scan-web-frontend-codebase`).
- Scope: `in_scope`, `out_of_scope`, `forbidden_actions`.
- Target: `{ url, stage (local|staging|production), dev_command? }`.
- Auth strategy: `none | shared | per_test_seed | storage_state`.
- Runner: default `playwright-mcp`.
- Report directory (default: `./reports/web-frontend-testing/<timestamp>/`).
- Optional: user-requested scenario overrides, severity rubric overrides.

If any required input is missing, return `validation_result: fail` with `unresolved_risks` listing the gaps. Do not invent inputs.

## Procedure

1. Create the report directory if it does not exist.
2. Build the plan using the schema in [./templates/test-plan.template.yaml](./templates/test-plan.template.yaml).
3. Generate one scenario per high-value surface:
   - Every uncovered route gets a `surface: route` smoke scenario.
   - Every interactive flow gets a `surface: form` or `surface: navigation` scenario as appropriate.
   - Every auth surface gets a `surface: auth` scenario (read-only unless user explicitly approves login execution).
   - Add at least one `surface: a11y` scenario covering the primary landing route.
   - Add one `surface: error_handling` scenario covering a known failure path when one exists in the inventory.
   - Add one `surface: responsive` scenario when the inventory shows responsive breakpoints or layout components.
4. Cap the plan at **10 scenarios in the first pass** unless the caller explicitly requested more.
5. For every destructive flow in the inventory:
   - Add a scenario with `priority: P1`, `surface` matching the flow kind, and `safety.destructive_actions_allowed: false` at the plan level by default.
   - Mark the scenario id in the return value under `destructive_scenarios` so the orchestrator can collect explicit user approval before execution.
6. Populate `safety.forbidden_urls` with hosts outside the explicit target and any user-listed forbidden hosts.
7. Populate `safety.forbidden_selectors` with anything the user called out (e.g., "do not click Pay").
8. Run the validation rules below by executing [./scripts/validate-plan.mjs](./scripts/validate-plan.mjs) against the written plan path. Fix any reported `ERROR:` lines and re-run until it exits 0; treat `WARN:` lines as risks that must be resolved or recorded in `unresolved_risks`.
9. Write the plan to `<report_dir>/test-plan.yaml`.

## Validation Rules (block on failure)

The validator at [./scripts/validate-plan.mjs](./scripts/validate-plan.mjs) enforces these rules deterministically against [../../schemas/web-frontend-test-plan.schema.yaml](../../schemas/web-frontend-test-plan.schema.yaml):

- `plan_version: 1` is present.
- Every scenario has a unique kebab-case `id`.
- Every scenario has at least one step with a non-empty `expect`.
- Every scenario lists at least one entry in `evidence_required`.
- Every step `action` is one of: `navigate | click | fill | press | snapshot | wait_for | evaluate | select`.
- `target.stage: production` forces `safety.destructive_actions_allowed: false`.
- No credential-shaped strings (JWT, GitHub PAT, OpenAI/Slack/AWS keys, `password=` literals, bearer headers) appear anywhere. Reference secrets via `${ENV_VAR}` or storage-state paths.
- `runner` defaults to `playwright-mcp`; other values emit a warning and require explicit caller opt-in.

Run the validator from the plugin root:

```bash
node skills/generate-web-frontend-test-plan/scripts/validate-plan.mjs <path-to-plan.yaml>
```

Exit codes: `0` on pass, `1` on validation errors, `2` on missing/invalid arguments.

## Output

Return:

- `plan_path`
- `scenario_count_by_priority`: `{ P1, P2, P3 }`
- `destructive_scenarios`: ids requiring explicit user approval
- `validation_result`: `pass | fail`
- `failed_validation_rules` (when `fail`)
- `scenarios_added`, `scenarios_updated`, `scenarios_skipped`
- `unresolved_risks`
- `recommended_next_agent`: `web-frontend-testing-execution`

## Resources

- [./templates/test-plan.template.yaml](./templates/test-plan.template.yaml) — canonical scenario shape and inline comments for each field.
- [./scripts/validate-plan.mjs](./scripts/validate-plan.mjs) — deterministic plan validator (schema + lint).
- [../../schemas/web-frontend-test-plan.schema.yaml](../../schemas/web-frontend-test-plan.schema.yaml) — JSON Schema (draft 2020-12) backing the validator.
