# UX Gremlin

UX Gremlin turns normal web UX flows into hostile-but-realistic resilience scenarios for Playwright, Playwright MCP, browser-agent workflows, and manual QA checklists.

Happy-path tests prove that the ideal route works. They usually miss the behavior users actually trigger: double submits, reloads during save, keyboard-only navigation, browser back/forward, stale state, expired sessions, duplicate data, slow networks, interrupted forms, and recovery from ambiguous states. UX Gremlin keeps the happy path as the baseline, then mutates it through realistic stress cases.

## Manual Commands

Run commands from a repository that has copied or installed this plugin:

```bash
node skills/ux-gremlin/scripts/ux-gremlin.mjs init
node skills/ux-gremlin/scripts/ux-gremlin.mjs check
node skills/ux-gremlin/scripts/ux-gremlin.mjs summary
node skills/ux-gremlin/scripts/ux-gremlin.mjs generate-playwright
node skills/ux-gremlin/scripts/ux-gremlin.mjs report
```

Use `--plan <path>` to validate or generate from a specific plan file:

```bash
node skills/ux-gremlin/scripts/ux-gremlin.mjs check --plan skills/ux-gremlin/examples/valid-plan.yaml
```

## Plan Workflow

1. Run `init` to create `.agent/session/ux-gremlin-plan.yaml`.
2. Fill in `target`, `mode`, `safety`, `authentication`, and the baseline happy-path flow.
3. Add gremlin scenarios that mutate the baseline. Each scenario needs an id, category, risk level, purpose, steps, expected behavior, assertions, bug indicators, recovery expectation, Playwright notes, and accessibility notes.
4. Run `check` until validation passes.
5. Run `summary` to review coverage.
6. Run `generate-playwright` when a starter Playwright spec is useful.
7. Run `report` after planning or execution to create `.agent/reports/ux-gremlin/report.md`.

The plan schema is documented in `skills/ux-gremlin/schemas/ux-gremlin-plan.schema.json`. The runtime validator uses only Node.js built-in modules and a conservative YAML parser for this plugin's template shape. JSON is supported as a fallback at `.agent/session/ux-gremlin-plan.json`.

## Test Modes

- `playwright_cli`: primary mode for generated starter specs and CI enforcement.
- `playwright_mcp`: use the same plan with a browser tool-backed agent.
- `agent_browser`: use the plan as a browser-agent checklist with recorded observations.
- `manual_checklist`: use the plan for human QA when automation is unavailable.

## Playwright CLI

Generate a starter spec:

```bash
node skills/ux-gremlin/scripts/ux-gremlin.mjs generate-playwright
```

The generated `.agent/generated/ux-gremlin.spec.ts` includes one baseline test and one test per gremlin scenario. It uses `test.step` blocks, role-based locator examples, and comments for assertions and recovery checks. It intentionally does not pretend unknown selectors are known.

After replacing placeholders with app-specific locators and fixtures:

```bash
npx playwright test .agent/generated/ux-gremlin.spec.ts
```

## Playwright MCP And Browser Agents

Use the plan as the source of truth. Run the baseline first, then each gremlin mutation. Record observed behavior, console errors, screenshots, traces, and recovery behavior in the report. When selectors are unknown, prefer accessible roles and names discovered from the page instead of brittle CSS or pixel coordinates.

## Hooks

The `hooks/` examples show how to initialize the plan near session start, validate before completion, and optionally generate a report at stop/session end. Hook syntax differs between host versions. These examples enforce required artifacts; they do not force skill selection.

## CI And Pre-Commit

CI is the stronger enforcement layer because it can block merges when `.agent/session/ux-gremlin-plan.yaml` is malformed or incomplete:

```bash
node skills/ux-gremlin/scripts/ux-gremlin.mjs check
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
node skills/ux-gremlin/scripts/ux-gremlin.mjs init
$EDITOR .agent/session/ux-gremlin-plan.yaml
node skills/ux-gremlin/scripts/ux-gremlin.mjs check
node skills/ux-gremlin/scripts/ux-gremlin.mjs summary
node skills/ux-gremlin/scripts/ux-gremlin.mjs generate-playwright
node skills/ux-gremlin/scripts/ux-gremlin.mjs report
```

## Troubleshooting

- `ERROR: plan file is missing`: run `init` or pass `--plan <path>`.
- `ERROR: baseline flow has no steps`: fill `baseline_flow.steps` before adding scenarios.
- `ERROR: no gremlin scenarios are defined`: add at least one scenario, and normally at least three for useful coverage.
- `ERROR: destructive actions are enabled without explicit safety notes`: either set destructive actions to false or document the approved safety boundary.
- YAML parse errors: keep the plan within the provided template shape or use `.agent/session/ux-gremlin-plan.json`.
