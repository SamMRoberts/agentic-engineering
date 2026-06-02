# UX Gremlin

UX Gremlin turns normal web UX flows into hostile-but-realistic resilience scenarios for Playwright execution and reporting using either CLI mode (`cli`) or MCP mode (`mcp`).

Happy-path tests prove that the ideal route works. They usually miss the behavior users actually trigger: double submits, reloads during save, keyboard-only navigation, browser back/forward, stale state, expired sessions, duplicate data, slow networks, interrupted forms, and recovery from ambiguous states. UX Gremlin keeps the happy path as the baseline, then mutates it through realistic stress cases.

## Manual Commands

Run commands from a repository that has copied or installed this plugin:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs init
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs check
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs coverage
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs summary
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs generate-playwright
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs ingest --input playwright-report.json
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs report
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs gate --results results.yaml --fail-on high
```

Use `--plan <path>` to validate or generate from a specific plan file:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs check --plan skills/web-ux-gremlin/examples/valid-plan.yaml
```

## Plan Workflow

1. Run `init` to create `.agent/session/web-ux-gremlin-plan.yaml`.
2. Fill in `target`, `mode`, `safety`, `authentication`, and the baseline happy-path flow.
3. Optionally set `flow_type` (`form`, `authenticated`, `long_running`, `crud`, `read_only`, `navigation`, or a list) so `check` can enforce the mandatory scenario categories for that flow.
4. Add gremlin scenarios that mutate the baseline. Each scenario needs an id, category, risk level, purpose, steps, expected behavior, assertions, bug indicators, recovery expectation, Playwright notes, and accessibility notes.
5. Run `check` until validation passes. `check` also prints `WARN:` lines when a declared condition (slow network, storage clear, etc.) has no covering scenario.
6. Run `coverage` to see flow-type category gaps and declared-condition warnings as an actionable list.
7. Run `summary` to review coverage.
8. Run `generate-playwright` when a starter Playwright spec is useful.
9. Run `report` after planning or execution to create `.agent/reports/web-ux-gremlin/report.md`, `report.json`, `report.html`, `report.junit.xml`, and `report.pr.md`.

## Coverage Enforcement

`check` enforces the SKILL scenario rules when `flow_type` is declared:

- `form` requires `invalid_required_fields`, `partial_form_completion`, `duplicate_entity_creation`, and `interrupted_save` scenarios.
- `authenticated` requires `expired_auth` or `permission_denied`.
- `long_running` requires `reload_mid_flow`, a timeout scenario (`slow_network` or `long_running_operation`), and `partial_form_completion`.
- `crud` requires `duplicate_entity_creation` and `concurrent_edit`.
- `navigation` requires `browser_back_forward`, `deep_link_entry`, or `unexpected_navigation`.

Missing required categories fail `check` with actionable errors. Declared `network_conditions`, `state_conditions`, and `data_conditions` that have no covering scenario produce non-blocking warnings. `coverage` prints the same information as a report without failing.

The plan schema is documented in `skills/web-ux-gremlin/schemas/web-ux-gremlin-plan.schema.json`. The runtime validator uses only Node.js built-in modules and a conservative YAML parser for this plugin's template shape. JSON is supported as a fallback at `.agent/session/web-ux-gremlin-plan.json`.

## Reports

Plan-only reports remain supported:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs report --plan skills/web-ux-gremlin/examples/valid-plan.yaml
```

To include executed outcomes, pass a structured results file:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs report \
  --plan skills/web-ux-gremlin/examples/valid-plan.yaml \
  --results skills/web-ux-gremlin/examples/results.example.yaml
```

Use `--out-dir <path>` to write all report artifacts somewhere other than `reporting.output_dir`.

The results contract is documented in `skills/web-ux-gremlin/schemas/web-ux-gremlin-results.schema.json`, with a starter template at `skills/web-ux-gremlin/templates/web-ux-gremlin-results.yaml`. Results capture scenario status (`passed`, `failed`, `blocked`, `not_run`, `needs_review`), severity, outcome, findings, suspected bugs, accessibility issues, console errors, screenshots, traces, recovery notes, executed commands, open risks, and optional run `build`/`commit` metadata.

Generated artifacts:

- `report.md`: human-readable report with an executive summary, trend, and Top Issues table for review and PR notes.
- `report.json`: normalized machine-readable summary (including `executive_summary`, `top_issues`, and `trend`) for agents and CI.
- `report.html`: self-contained static HTML with summary cards, severity badges, status/severity bars, escaped content, and no scripts or remote assets.
- `report.junit.xml`: JUnit results for CI dashboards (failed/blocked map to failures; not_run/needs_review map to skipped).
- `report.pr.md`: compact PR-comment summary with verdict, pass rate, and the top issues.

### Executive Summary And Risk Score

Every report opens with a leadership-ready executive summary: an overall verdict (`Pass`, `Pass with risks`, `Fail`, or `Not executed`), pass rate, a severity-weighted risk score (0-100 with a band), highest open severity, suspected bug and accessibility blocker counts, and run metadata (date, executor, environment, build/commit). The Top Issues table ranks open issues by severity and recommends a next action for each.

### Run History And Trends

When a report includes executed results, the run is appended to `history.json` in the report directory and the report shows a short trend (pass-rate and open-bug delta) versus the previous run. Pass `--no-history` to skip reading or writing history.

## Ingesting Executed Results

Instead of authoring results by hand, run the generated spec with Playwright's JSON reporter and convert the output:

```bash
npx playwright test .agent/generated/web-ux-gremlin.spec.ts --reporter=json > playwright-report.json
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs ingest --input playwright-report.json --out .agent/session/web-ux-gremlin-results.json
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs report --results .agent/session/web-ux-gremlin-results.json
```

`ingest` maps each spec back to its scenario using the `web-ux-gremlin-scenario` annotation emitted by the generated spec (falling back to the `id:` title prefix). If the baseline test failed, every mutation scenario is marked `blocked` and the failure is surfaced as an open risk. Pass `--axe <axe.json>` to attach axe-core violations (a single run attaches globally; an array of `{ scenario_id, violations }` attaches per scenario). Set `WEB_UX_GREMLIN_BUILD` and `WEB_UX_GREMLIN_COMMIT` to stamp build metadata.

## CI Severity Gate

`gate` (or `report --fail-on <severity>`) exits non-zero when the highest open severity is at or above a threshold, so CI can block merges on real regressions:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs gate \
  --results .agent/session/web-ux-gremlin-results.json --fail-on high
```

`report --fail-on <severity>` writes all artifacts first and then applies the gate, so the report is always available even when the gate fails.

## Execution Modes

- `cli` (default): execute the generated spec through `npx playwright test` with token-efficient CLI runs.
- `mcp`: execute using `playwright-mcp` for persistent sessions and richer exploratory automation.

## Playwright CLI

Generate a starter spec:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs generate-playwright
```

The generated `.agent/generated/web-ux-gremlin.spec.ts` includes one baseline test and one test per gremlin scenario. It uses `test.step` blocks, role-based locator examples, and annotates each test with its scenario id and risk so results can be ingested later. Each scenario is **failing-by-default**: an unfinished test throws via `requireImplementation(...)` so an incomplete spec cannot silently pass in CI. Replace the `requireImplementation` guard with concrete `expect(...)` assertions as you implement each scenario. Set `WEB_UX_GREMLIN_ALLOW_TODO=true` to soft-skip unfinished scenarios while iterating locally. It intentionally does not pretend unknown selectors are known.

After replacing placeholders with app-specific locators and fixtures:

```bash
npx playwright test .agent/generated/web-ux-gremlin.spec.ts
```

## Playwright MCP

Use the plan as the source of truth. Run the baseline first, then each gremlin mutation. Record observed behavior, console errors, screenshots, traces, and recovery behavior in the report. When selectors are unknown, prefer accessible roles and names discovered from the page instead of brittle CSS or pixel coordinates.

## Hooks

The `hooks/` examples show how to initialize the plan near session start, validate before completion, and optionally generate a report at stop/session end. Hook syntax differs between host versions. These examples enforce required artifacts; they do not force skill selection.

## CI And Pre-Commit

CI is the stronger enforcement layer because it can block merges when `.agent/session/web-ux-gremlin-plan.yaml` is malformed or incomplete, and because the severity gate blocks merges on executed regressions:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs check
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs coverage
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs gate --results .agent/session/web-ux-gremlin-results.json --fail-on high
```

See `ci/github-action.example.yml` for a copy-ready workflow.

## Safety Rules

- Do not test against production data unless the user explicitly approves that scope.
- Keep `safety.destructive_actions_allowed` false by default.
- If destructive actions are enabled, `safety.notes` must explain the boundary and cleanup.
- Use prefixed test data and cleanup expectations.
- Do not create duplicate, delete, payment, permission, or irreversible scenarios without explicit safety review.

## Accessibility Expectations

Every applicable flow should include keyboard-only operation, visible focus, correct focus return after modals, accessible names for controls, validation messages tied to fields, and status announcements for long-running operations.

## Example Workflow

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs init
$EDITOR .agent/session/web-ux-gremlin-plan.yaml
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs check
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs summary
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs generate-playwright
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs report
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs report --results skills/web-ux-gremlin/examples/results.example.yaml
```

## Troubleshooting

- `ERROR: plan file is missing`: run `init` or pass `--plan <path>`.
- `ERROR: baseline flow has no steps`: fill `baseline_flow.steps` before adding scenarios.
- `ERROR: no gremlin scenarios are defined`: add at least one scenario, and normally at least three for useful coverage.
- `ERROR: destructive actions are enabled without explicit safety notes`: either set destructive actions to false or document the approved safety boundary.
- `ERROR: results file is missing`: pass an existing results YAML/JSON file or omit `--results` for a plan-only report.
- `ERROR: scenario result ... status must be one of`: use `passed`, `failed`, `blocked`, `not_run`, or `needs_review`.
- YAML parse errors: keep the plan within the provided template shape or use `.agent/session/web-ux-gremlin-plan.json`.
