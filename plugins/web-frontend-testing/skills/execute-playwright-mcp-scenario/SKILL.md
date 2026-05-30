---
name: execute-playwright-mcp-scenario
description: 'Use when executing exactly one approved Playwright MCP scenario from a validated test-plan.yaml (live browser exploration or MCP-specific evidence capture). Captures snapshot, console, network, and screenshot evidence, validates each `expect`, and writes a structured findings YAML. Use for: running one MCP scenario, capturing evidence for a single flow, recording findings. Do not use for: Playwright CLI execution (use run-playwright-cli-frontend-test), running multiple scenarios in one pass, generating Playwright CLI tests, or writing reports.'
argument-hint: 'Validated plan path, scenario_id to run, evidence output directory, auth artifact references (paths/env names only), and stop conditions.'
user-invocable: false
---

# Execute Playwright MCP Scenario

Run one approved scenario via Playwright MCP, capture evidence, and emit a structured finding file. The owning agent re-invokes this skill once per scenario.

## When to Use

- The plan was validated and the user approved the scenario.
- The orchestrator forwarded a single `scenario_id`.
- The browser session is either closed or already on the correct origin.

## Pre-Execution Checklist (block on any failure)

- Plan file exists at the given path and contains a scenario with the requested `scenario_id`.
- `target.stage` is non-production OR the orchestrator forwarded explicit user approval for production read-only execution.
- Auth artifacts are referenced (paths or env var names), never inline.
- Scenario does not target any entry in `safety.forbidden_urls` or `safety.forbidden_selectors`.
- For destructive scenarios, the orchestrator forwarded explicit user confirmation.

If any check fails, return `status: blocked` with the failing check.

## Tool Mapping

| Plan `action` | MCP tool |
|---|---|
| `navigate`     | `playwright/browser_navigate` |
| `click`        | `playwright/browser_click` |
| `fill`         | `playwright/browser_fill_form` or `playwright/browser_type` |
| `press`        | `playwright/browser_press_key` |
| `select`       | `playwright/browser_select_option` |
| `wait_for`     | `playwright/browser_wait_for` |
| `evaluate`     | `playwright/browser_evaluate` |
| `snapshot`     | `playwright/browser_snapshot` |

Evidence capture tools (called between steps as needed):

- `playwright/browser_snapshot`
- `playwright/browser_take_screenshot`
- `playwright/browser_console_messages`
- `playwright/browser_network_requests`

## Procedure

1. `playwright/browser_navigate` to `target.url` (or the scenario's first `navigate` step).
2. Capture a baseline `playwright/browser_snapshot`. If `evidence_required` includes `screenshot`, also call `playwright/browser_take_screenshot`.
3. For each step in `steps`:
   1. Invoke the mapped MCP tool with the step's `target` and `value`.
   2. Capture deltas with `playwright/browser_console_messages` and `playwright/browser_network_requests`.
   3. Validate `expect` against the latest snapshot/console/network output.
   4. On failure or anomaly, append a finding using [./templates/finding.template.yaml](./templates/finding.template.yaml).
4. After the final step, capture a closing `playwright/browser_snapshot`.
5. Write findings (if any) to `<report_dir>/findings/<scenario-id>.yaml`.
6. Call `playwright/browser_close` only when the orchestrator signals it is the final scenario, or when a stop condition fires.

## Stop Immediately When

- A `safety.forbidden_url` or `safety.forbidden_selector` is touched.
- An unhandled dialog requires destructive confirmation.
- Console emits an uncaught error not anticipated by the scenario.
- The orchestrator forwards a user stop directive.

In every stop case, return `status: stopped` with the trigger noted in `blockers`.

## Finding Severity Guidance

- `critical`: data loss, security exposure, broken auth, or production outage signal.
- `high`: scenario-blocking functional failure, a11y violation that prevents task completion, or PII leak.
- `medium`: scenario completes but with degraded UX or recoverable error.
- `low`: cosmetic, non-blocking console warning, or minor a11y issue.
- `info`: observation worth recording but not a defect (e.g., slow response under threshold).

## Output

Return:

- `scenario_id`
- `status`: `pass | fail | blocked | stopped`
- `findings_path` (when findings written)
- `evidence_captured`: counts of snapshots, screenshots, console messages, network requests
- `browser_state`: `open | closed`
- `blockers`
- `recommended_next_agent`: `web-frontend-testing-execution` (next scenario) or `web-frontend-testing-results` (when all scenarios complete)

## Resources

- [./templates/finding.template.yaml](./templates/finding.template.yaml) — canonical finding shape.
