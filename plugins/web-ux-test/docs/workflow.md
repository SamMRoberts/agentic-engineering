# Workflow

The `web-ux-test` workflow is a strict 14-phase state machine. The CLI/app owns transitions; the agent never advances state by writing prose.

## Phases

| # | Phase | Entered by |
| --- | --- | --- |
| 1 | `initialized` | `web-ux-test init` |
| 2 | `plan_created` | `web-ux-test plan create <path>` |
| 3 | `plan_validated` | `web-ux-test plan validate <path>` |
| 4 | `auth_configured` | `web-ux-test auth setup` (optional) |
| 5 | `selectors_discovered` | `web-ux-test selectors discover` |
| 6 | `test_skeleton_generated` | `web-ux-test test generate` |
| 7 | `test_reviewed` | `web-ux-test test review` |
| 8 | `test_executed` | `web-ux-test run phase test_executed` |
| 9 | `failure_classified` | `web-ux-test failure classify` (only on failed run) |
| 10 | `repair_proposed` | `web-ux-test repair propose --proposal <path>` |
| 11 | `repair_approved` | `web-ux-test repair approve` |
| 12 | `repair_applied` | `web-ux-test repair apply` |
| 13 | `rerun_passed` | `web-ux-test run phase test_executed` after `repair_applied` |
| 14 | `report_generated` | `web-ux-test report generate` |

## Transition table

Defined in `lib/workflow/phases.mjs#TRANSITIONS`. Any `(phase, event)` pair not present is an invalid transition and the CLI exits non-zero.

Notable rules:

- `plan_validated` may go directly to `selectors_discovered`, skipping `auth_configured`, when the plan does not require auth.
- `test_executed` with a passing run goes directly to `report_generated`. With a failed run, it must go to `failure_classified`.
- `failure_classified` may go to `repair_proposed` (to attempt a fix) or to `report_generated` (to finish without a repair).
- `report_generated` is terminal for this run; starting a new run begins from a fresh `initialized` state.

## Engine isolation

`lib/workflow/engine.mjs` is pure: `(state, event) -> { ok, state } | { ok: false, error }`. No I/O. The CLI, MCP server, hooks, and tests all call into it.

## State persistence

`.web-ux-testing/state.json` is the only durable workflow record. It is schema-validated on every read and write (`schemas/workflow-state.schema.yaml`). Writes go through an atomic temp-file rename and an optimistic file-lock at `.web-ux-testing/state.lock`.

## `run next` semantics

`web-ux-test run next` runs the engine-suggested next event **only when no payload is required**. For payload-bearing events (plan creation, test execution, repair proposal, classification), use the matching dedicated command. `run next` deliberately refuses to guess inputs.

## `run phase <phase>` semantics

Used to advance into a specific no-payload phase. Example: from `plan_validated`, `run phase selectors_discovered` is valid; `run phase test_executed` is rejected because the test execution event requires a payload (use `run phase test_executed` which is routed through the runner) — see `bin/web-ux-test.mjs` for the dispatch.
