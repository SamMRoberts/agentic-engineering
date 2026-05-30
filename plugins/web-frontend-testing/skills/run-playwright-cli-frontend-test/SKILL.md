---
name: run-playwright-cli-frontend-test
description: 'Use when running exactly one Playwright CLI test target for a web frontend from the terminal. Use for executing a generated spec, an existing spec, a grep pattern, or a project-specific test command; surfacing the running CLI session for visibility; pausing first for manual authentication when the user must sign in before tests; capturing artifacts; and mapping failures back to scenario IDs. Do not use for Playwright MCP browser exploration or for running broad multi-scenario suites.'
argument-hint: 'Provide one CLI target (spec path, grep, or test command), validated plan path, current scenario_id when known, base URL, Playwright project/browser, auth/storage-state policy, show_cli_session, pre_test_auth_session config, output directory, and safety constraints.'
user-invocable: false
---

# Run Playwright CLI Frontend Test

Run exactly one Playwright CLI target for the web frontend and normalize the execution result for analysis.

## When to Use

- The validated `test-plan.yaml` selects `runner: playwright-cli` or `runner: hybrid` and the orchestrator forwarded a single CLI target.
- The user explicitly asked to run an existing Playwright spec or a generated regression spec.
- A CI-style regression run for one target needs deterministic execution and artifact capture.

Do **not** use this skill for live MCP browser exploration; use `execute-playwright-mcp-scenario` instead.

## Required Inputs

- Validated plan path and the active `scenario_id` (when running a plan scenario).
- Exactly one CLI target. In priority order:
  1. Scenario `test_file` from the plan.
  2. Scenario `test_command` from the plan.
  3. Plan-level `cli_session.test_command` (when running the whole plan deliberately).
  4. Generated spec path under the scenario's `executable_steps` output directory.
  5. A grep pattern paired with `cli_session.test_dir`.
- Workspace path (repo root the command runs from).
- Base URL (`cli_session.base_url` or `target.url`).
- Playwright project/browser (`cli_session.project`, default `chromium`).
- Auth strategy (`target.auth_strategy`) and storage-state path when applicable.
- `show_cli_session` (default `false`).
- `pre_test_auth_session` config (default `{ enabled: false }`).
- Output directory for artifacts (default: `<report_dir>/cli/<scenario-id>/`).
- Safety constraints: production policy, destructive-action policy, forbidden URLs/selectors.

If a required input is missing, return `status: blocked` with the gap; do not guess.

## Pre-Execution Checklist (block on any failure)

- Plan validation passed for the supplied plan path.
- Exactly one CLI target resolved from the inputs above.
- The target does not touch any `safety.forbidden_urls` or `safety.forbidden_selectors`.
- `target.stage` is non-production OR the orchestrator forwarded explicit user approval for read-only production execution.
- For destructive scenarios, the orchestrator forwarded explicit user confirmation.
- If `pre_test_auth_session.enabled: true`, `target.auth_strategy` is `none`, `shared`, or `storage_state`.

## Pre-Test Authentication Session (optional)

When `pre_test_auth_session.enabled: true`, open the CLI session **before** running tests so the user can authenticate manually:

1. Select the mode:
   - `headed_browser` — launch `npx playwright open <base_url>` (or `npx playwright codegen` when `mode: codegen`) in a visible browser.
   - `custom_command` — run `pre_test_auth_session.command` in a visible terminal.
2. Surface the session to the user so they can complete sign-in.
3. Wait for the configured `ready_signal`:
   - `user_confirmation` — pause until the user explicitly confirms they are signed in.
   - `storage_state_written` — wait until `storage_state_path` exists and is non-empty, then continue.
   - `exit_code` — wait for the configured command to exit `0`.
4. Record the auth artifact reference (path or env var), never the credentials themselves.
5. If the ready signal does not arrive within a reasonable bound, return `status: blocked` with the auth step that timed out.

Do **not** type, paste, log, or screenshot credentials. Never write user-entered passwords to the terminal stream, log file, or trace.

## Test Execution

1. Build the narrowest safe command for the resolved CLI target. Prefer in this order:
   - Plan-supplied `test_command` (scenario or plan-level).
   - `npx playwright test <test_file> --project=<project>` for a single spec.
   - `npx playwright test <test_dir> --grep <pattern> --project=<project>` for a grep target.
2. When `show_cli_session: true`, append `--headed` (and optionally `--reporter=list`) so the run is visible to the user. Surface stdout/stderr live; do not buffer silently.
3. When auth uses `storage_state`, pass it via the project config or `--storage-state=<path>` if the project does not embed it. Never inline credentials on the command line.
4. Capture exit code, key stdout/stderr excerpts, the Playwright HTML report path, screenshots, traces, and videos to the output directory.
5. Map failures back to the active `scenario_id` using test titles, file names, or generated metadata. When grep targets multiple specs, only report on the requested scenario.

## Stop Immediately When

- A forbidden URL or selector is referenced by the resolved target.
- The user issues a stop directive during pre-test auth or execution.
- The plan validator reports new errors after a re-read.
- Console/network artifacts indicate destructive side effects not authorized by the plan.

## Safety Rules

- Do not run destructive, production-targeted, or broad/full-suite tests without explicit confirmation.
- Do not run more than one CLI target per invocation.
- Do not print secrets from environment variables, config, traces, logs, or screenshots.
- Do not echo `cli_session.command` output when it contains credentials; redact and reference the command id instead.
- Do not use Playwright MCP browser tools.

## Output

Return:

- `scenario_id` (when applicable)
- `command_run`
- `working_directory`
- `exit_code`
- `status`: `pass | fail | blocked | stopped`
- `pre_test_auth_session`: `{ used, mode, ready_signal, ready: bool, notes }`
- `cli_session_visible`: `true | false`
- `report_path`, `artifact_paths`
- `failing_tests`: `[{ title, file, mapped_scenario_id }]`
- `stdout_excerpts`, `stderr_excerpts` (truncated, no secrets)
- `blockers` or required user confirmations
- `recommended_next_agent`: `web-frontend-testing-cli-execution` (next target), `web-frontend-testing-execution` (MCP fallback), or `web-frontend-testing-results` (when all targets complete)
