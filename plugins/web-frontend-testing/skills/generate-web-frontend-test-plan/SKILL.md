---
name: generate-web-frontend-test-plan
description: 'Use when generating or refining a standardized Playwright test plan for a web frontend. Produces `test-plan.yaml` with scenarios, priorities, safety constraints, optional CLI execution targets, and pre-execution validation. Supports playwright-cli (preferred), playwright-mcp, and hybrid runners. Use for: creating a test plan, adding scenarios, choosing a runner, marking destructive scenarios, configuring CLI session visibility and pre-test manual authentication, validating a plan before execution. Do not use for: executing scenarios, running Playwright CLI specs, or producing reports.'
argument-hint: 'Surface inventory, scope summary, auth strategy, runner (default playwright-cli; use playwright-mcp for exploration or hybrid for discovery-then-regression), safety constraints, CLI session preferences (show_cli_session, pre_test_auth_session), report directory, and any user-requested scenario overrides.'
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
- Runner: `playwright-cli` (default and preferred for execution/regression), `playwright-mcp` (only for live exploration or MCP-specific evidence capture), or `hybrid` (MCP discovery then CLI regression).
- Report directory (default: `./reports/web-frontend-testing/<timestamp>/`).
- Optional: user-requested scenario overrides, severity rubric overrides, `cli_session` preferences.

If any required input is missing, return `validation_result: fail` with `unresolved_risks` listing the gaps. Do not invent inputs.

## Procedure

1. Create the report directory if it does not exist.
2. Build the plan using the schema in [./templates/test-plan.template.yaml](./templates/test-plan.template.yaml).
3. Choose the runner:
   - Default to `playwright-cli` when the user wants execution, regression, CI, or repeatable tests.
   - Use `playwright-mcp` only when the user wants live browser exploration, discovery, or MCP evidence capture.
   - Use `hybrid` when MCP discovery should produce or refine scenarios that are then converted to CLI regression tests.
4. Generate one scenario per high-value surface:
   - Every uncovered route gets a `surface: route` smoke scenario.
   - Every interactive flow gets a `surface: form` or `surface: navigation` scenario as appropriate.
   - Every auth surface gets a `surface: auth` scenario (read-only unless the user explicitly approves login execution).
   - Add at least one `surface: a11y` scenario covering the primary landing route.
   - Add one `surface: error_handling` scenario covering a known failure path when one exists in the inventory.
   - Add one `surface: responsive` scenario when the inventory shows responsive breakpoints or layout components.
5. For CLI-eligible scenarios, populate the CLI execution metadata:
   - Set `convert_to_regression_test: true` and `executable_steps` for scenarios the converter should generate as Playwright specs.
   - Set `test_file` for scenarios that already have a Playwright spec on disk.
   - Set `test_command` when the user wants to run a project-specific script (for example, an `npm` script the consuming repo already defines for end-to-end tests, scoped with a grep pattern).
6. Configure CLI session behavior when relevant:
   - Use `cli_session.show_cli_session: true` to surface the running CLI session (headed mode, visible terminal stream) during execution.
   - Use `cli_session.pre_test_auth_session.enabled: true` when the user needs to authenticate manually before tests run; set `mode` (`headed_browser | codegen | custom_command`) and `ready_signal` (`user_confirmation | storage_state_written | exit_code`). Pair `storage_state_written` with `storage_state_path` and `exit_code` with `command`.
   - Per-scenario `show_cli_session` and `pre_test_auth_session` override the plan-level defaults.
7. Cap the plan at **10 scenarios in the first pass** unless the caller explicitly requested more.
8. For every destructive flow in the inventory:
   - Add a scenario with `priority: P1`, `surface` matching the flow kind, and `safety.destructive_actions_allowed: false` at the plan level by default.
   - Mark the scenario id in the return value under `destructive_scenarios` so the orchestrator can collect explicit user approval before execution.
9. Populate `safety.forbidden_urls` with hosts outside the explicit target and any user-listed forbidden hosts.
10. Populate `safety.forbidden_selectors` with anything the user called out (e.g., "do not click Pay").
11. Run the validation rules below by executing [./scripts/validate-plan.mjs](./scripts/validate-plan.mjs) against the written plan path. Fix any reported `ERROR:` lines and re-run until it exits 0; treat `WARN:` lines as risks that must be resolved or recorded in `unresolved_risks`.
12. Write the plan to `<report_dir>/test-plan.yaml`.

## Validation Rules (block on failure)

The validator at [./scripts/validate-plan.mjs](./scripts/validate-plan.mjs) enforces these rules deterministically against [../../schemas/web-frontend-test-plan.schema.yaml](../../schemas/web-frontend-test-plan.schema.yaml):

- `plan_version: 1` is present.
- Every scenario has a unique kebab-case `id`.
- Every scenario has at least one step with a non-empty `expect`.
- Every scenario lists at least one entry in `evidence_required`.
- Every step `action` is one of: `navigate | click | fill | press | snapshot | wait_for | evaluate | select`.
- Every `executable_step` action is one of: `navigate | click | fill | select | press | assert_visible | assert_text | assert_url | screenshot`, with the locator/value/key/expected fields required for each action.
- `target.stage: production` forces `safety.destructive_actions_allowed: false`.
- `runner: playwright-cli` or `runner: hybrid` requires a deterministic CLI target: at least one scenario with `executable_steps`, `test_file`, or `test_command`, or a plan-level `cli_session.test_command`/`cli_session.test_dir`.
- `runner: hybrid` requires both MCP-style steps and a CLI target to be present.
- `pre_test_auth_session.enabled: true` requires `target.auth_strategy` to be `none`, `shared`, or `storage_state`; `storage_state_written` requires `storage_state_path`; `exit_code` requires `command`.
- No credential-shaped strings (JWT, GitHub PAT, OpenAI/Slack/AWS keys, `password=` literals, bearer headers) appear anywhere. Reference secrets via `${ENV_VAR}` or storage-state paths.

Run the validator from the plugin root:

```bash
node skills/generate-web-frontend-test-plan/scripts/validate-plan.mjs <path-to-plan.yaml>
```

Exit codes: `0` on pass, `1` on validation errors, `2` on missing/invalid arguments.

## Output

Return:

- `plan_path`
- `runner`: `playwright-cli | playwright-mcp | hybrid`
- `cli_session_summary`: `{ show_cli_session, pre_test_auth_session_enabled, ready_signal? }` when CLI is used
- `scenario_count_by_priority`: `{ P1, P2, P3 }`
- `destructive_scenarios`: ids requiring explicit user approval
- `regression_candidates`: ids with `convert_to_regression_test: true`
- `validation_result`: `pass | fail`
- `failed_validation_rules` (when `fail`)
- `scenarios_added`, `scenarios_updated`, `scenarios_skipped`
- `unresolved_risks`
- `recommended_next_agent`: `web-frontend-testing-cli-execution` (CLI/hybrid CLI targets), `web-frontend-testing-execution` (MCP scenarios), or a conversion step via `convert-web-frontend-plan-to-playwright-tests` when scenarios need generating.

## Resources

- [./templates/test-plan.template.yaml](./templates/test-plan.template.yaml) — canonical scenario shape and inline comments for each field, including CLI and pre-test auth examples.
- [./scripts/validate-plan.mjs](./scripts/validate-plan.mjs) — deterministic plan validator (schema + lint).
- [../../schemas/web-frontend-test-plan.schema.yaml](../../schemas/web-frontend-test-plan.schema.yaml) — JSON Schema (draft 2020-12) backing the validator.

