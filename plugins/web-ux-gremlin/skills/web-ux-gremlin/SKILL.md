---
name: web-ux-gremlin
description: "Use when: hunting for UX bugs with Playwright using the web-ux-gremlin plugin. Use for: gremlin mode, unusual UX mayhem, discover user-visible failures, create UX bug-hunt test plans, generate Playwright specs, run tests, debug failures, and coordinate the playwright-test-planner, playwright-test-generator, and playwright-test-healer sub-agents."
argument-hint: "Target app or URL, UX flows or bug classes to hunt, auth/start state, whether to use standard or gremlin mode, and whether to plan, generate, run, or heal tests"
user-invocable: true
---

# Web UX Gremlin

## Purpose

The `web-ux-gremlin` plugin and this skill are for hunting UX bugs: broken user journeys, confusing states, validation gaps, inaccessible controls, regressions, and other user-visible failures. In gremlin mode, the workflow deliberately creates uncommon, chaotic Playwright scenarios that poke at edge-case UX behavior instead of only replaying happy paths. Use this skill to create and run Playwright tests through the plugin's three stage agents:

- `playwright-test-planner` explores the target and saves a Markdown UX bug-hunt test plan.
- `playwright-test-generator` converts one bug-hunt scenario at a time into Playwright spec files.
- `playwright-test-healer` runs, debugs, edits, and verifies failing Playwright tests while distinguishing product UX bugs from test defects.

The workflow is bug-hunt planner -> generator -> test run -> healer -> UX bug report.

## Required Inputs

Collect or infer these before delegating:

- Target app URL or local app start instructions.
- Test goal, target area, user flows, or UX bug classes to hunt.
- Auth model and safe test account setup, if needed.
- Starting state, seed data, and destructive-action policy.
- Desired scope: plan only, generate from plan, run existing tests, heal failures, or full workflow.
- Mode: standard bug hunt or gremlin mode. Default to gremlin mode when the user asks to "release the gremlins", "break the UX", "cause mayhem", "stress UX", or find unusual edge cases.
- Gremlin intensity when in gremlin mode: pick a numeric value from `1` to `5` (higher = more chaotic).
  - `1` = single-tactic chaos, `2` = light, `3` = broad, `4` = aggressive, `5` = maximal chaos.
- Output locations, defaulting to `specs/` for plans and `tests/` for Playwright specs.
- Confirm these execution controls with the user before running anything:
  - Browser: `Chrome (headless)`, `Chrome (headed with remote devtools)`, or `Other`.
  - Playwright execution method: `MCP`, `CLI`, or `Other`.
  - If headed mode is selected, whether the user needs to authenticate in the browser session before tests begin.
  - Optional run mode: run one plan item first vs full generated suite.
  - Whether existing tests may be reused, replaced, or kept unchanged.
  - Any explicit destructive-action constraints for mutations and fixtures.

If any required execution control is not provided, including gremlin intensity for gremlin mode, stop and ask for it before proceeding.

## Modes

### Standard Bug Hunt

Use standard mode when the user asks for normal UX coverage, regression tests, or specific documented flows. Tests should still include negative cases, recovery checks, and accessibility expectations, but they should mainly follow realistic user journeys.

### Gremlin Mode

Use gremlin mode when the user asks for mayhem, edge cases, resilience, abuse cases, or anything that should "live up to the gremlin name." Gremlin mode must generate tests that perform unusual but safe user actions from `checklists/gremlin-mode.md`, including combinations that are uncommon in ordinary QA scripts:

- Rapid or duplicated interactions such as double-clicks, repeated submits, impatient navigation, back/forward/reload during a flow, and toggling controls out of the expected order.
- Strange but user-enterable data such as emoji, right-to-left text, excessive length, whitespace-only input, pasted content, mixed casing, boundary values, invalid dates, and file names with special characters.
- State disruption such as viewport changes, theme or locale changes when available, offline/online transitions, cleared storage, expired-looking sessions, multiple tabs, and stale pages.
- Alternate input paths such as keyboard-only operation, Enter/Escape shortcuts, focus cycling, drag/drop where supported, paste instead of typing, and skipped optional steps.
- Recovery pressure such as cancel/retry loops, partial form completion, interrupted uploads or saves, transient network failures, and returning to a half-finished task.

Gremlin mode must remain safe: avoid production data, irreversible mutations, uncontrolled load, credential disclosure, destructive flows without explicit approval, and tests that depend on arbitrary sleeps or pixel coordinates.

Apply the gremlin intensity (1–5) as a chaos budget:
- `1`: one intentional unusual action plus one recovery assertion.
- `2`: two unusual actions, including one state-disruption action if possible.
- `3`: three unusual actions and two recovery assertions.
- `4`: four unusual actions with mixed interaction/input/path disruptions.
- `5`: five unusual actions with layered cross-surface disruption and at least three recovery assertions.

## Stop Conditions

Stop and ask for clarification when:

- No target app, URL, or already-running page is available.
- The flow would mutate production data or real accounts without explicit approval and safe fixtures.
- Authentication requires secrets that the user has not configured outside chat.
- The Playwright MCP tools, `playwright-test-planner`, `playwright-test-generator`, or `playwright-test-healer` are unavailable.
- `npx playwright init-agents --loop=vscode` has not been run successfully in the target workspace.
- Required execution-control answers are missing: browser choice, Playwright tool choice, and headed-browser authentication decision.
- Required gremlin intensity is missing when mode is gremlin.
- The requested scope would overwrite existing tests without user approval.

Do not ask for passwords, API keys, cookies, or tokens in chat. Tell the user to configure those directly in their environment.

## Preflight

1. Confirm the current workspace root is the target Playwright project root containing `package.json`, `playwright.config.ts`, `tests/`, and `specs/`. If not, stop and ask the user to open the correct project root.
2. Ensure the project has Playwright initialized and Playwright custom agents installed before using planner/generator/healer stages:
   - If `package.json` is missing Playwright setup, run:
     - `npm init playwright@latest`
   - Always run and verify:
     - `npx playwright init-agents --loop=vscode`
3. If the target Playwright project is not the current workspace root, stop and tell the user to open that project as the workspace or restart the Playwright MCP server with `--config /absolute/path/to/playwright.config.ts`.
4. Confirm the custom agents are available before delegation:
   - If `playwright-test-planner`, `playwright-test-generator`, or `playwright-test-healer` are not listed in the project or MCP context, rerun step 2 and stop until they are available.
5. Identify the safest command for validation, usually `npx playwright test` or a targeted spec path, and run it from the target project root.
6. Keep generated tests scoped to the requested UX flows, risks, and bug hypotheses.

If `npx playwright init-agents --loop=vscode` fails, block progression and ask the user to run it manually, share the exact error, and continue only after it succeeds.

Required execution-control questions to ask before delegation:

```text
Execution Control:
- Browser: Chrome (headless) | Chrome (headed with remote devtools) | Other
- Playwright tool: MCP | CLI | Other
- Headed auth: Does headed execution require manual authentication before tests begin? yes | no
- Gremlin intensity (if gremlin mode): 1-5
- Run mode: single generated spec first | full generated suite
- Existing tests: replace | append | untouched
- Safety: safe fixtures available? yes | no
```

If any required answer is missing or marked `Other`/`no` for any safety requirement, stop and confirm before continuing.

## Procedure

### 1. Plan

Delegate to `playwright-test-planner` when the request needs a new or refreshed UX bug-hunt plan.

Handoff should include:

```text
Target app or URL:
Scope / flows:
UX risks or bug classes to hunt:
Mode: standard or gremlin
Auth and starting state:
Safety constraints:
Plan output path:
Out of scope:
```

Require the planner to save a Markdown plan under `specs/`. Review the plan before generation and ensure it has independent scenarios, clear steps, expected outcomes, negative cases, safe assumptions, and explicit UX failure modes such as blocked paths, misleading feedback, missing validation, inaccessible controls, layout breakage, or confusing recovery states.

For gremlin mode plans, require every scenario to name:

- The gremlin tactic from `checklists/gremlin-mode.md`.
- The unusual user behavior being simulated.
- The UX failure mode it is trying to expose.
- The safe rollback or recovery expectation.

### 2. Generate

Delegate to `playwright-test-generator` once per UX bug-hunt scenario that should become an automated test.

Use this handoff shape:

```xml
<test-suite>Top-level plan section name</test-suite>
<test-name>Scenario name</test-name>
<test-file>tests/path/to/scenario-name.spec.ts</test-file>
<seed-file>tests/seed.spec.ts or another seed file from the plan</seed-file>
<mode>standard or gremlin</mode>
<body>Scenario steps, expected outcomes, and UX failure mode from the saved plan</body>
```

Require one test per generated file unless the user explicitly asks for grouped specs. Prefer accessible locators, visible assertions, and comments that preserve the plan step text. Assertions should check user-visible behavior and UX outcomes rather than internal implementation details.

For gremlin mode specs, require each test to include:
- a gremlin action count driven by the selected intensity (minimum actions = intensity value, capped by scenario relevance), and
- one recovery assertion after each unusual action cluster.
Examples include resizing mid-flow, submitting twice, pasting unusual Unicode, pressing Escape during a modal, going offline before retrying, clearing storage before reload, or using keyboard navigation instead of clicks.

### 3. Run

Run the narrowest useful Playwright command after generation:

```bash
npx playwright test path/to/generated.spec.ts
```

For full-suite validation, use:

```bash
npx playwright test
```

Always run Playwright commands from the target project root. Do not use `npm exec --prefix <project> -- playwright test` from another directory, because Playwright can resolve a different config and load tests with a different runner instance.

Capture failing test names, file paths, browser/project names, and the first actionable error. Treat failures as possible UX bugs until the healer determines whether the issue is product behavior, bad test setup, brittle selectors, or environment instability.

### 4. Heal

Delegate failures to `playwright-test-healer` one failure at a time.

Handoff should include:

```text
Failing command:
Failing test file:
Failing test name:
Observed error:
Expected behavior:
Suspected UX bug or failure mode:
Safety constraints:
```

Require the healer to rerun after each fix. Prefer robust selectors and assertions over timing workarounds. Do not use `networkidle`. If the app behavior is confidently different from the plan, preserve the UX finding in the report. If the test is still valuable but blocked by known product behavior, allow `test.fixme()` only with a comment explaining the observed UX behavior.

### 5. Report

Finish with:

- Plan file created or reused.
- Test files created or changed.
- Commands run and pass/fail status.
- UX bugs found, suspected, or ruled out.
- Failures healed, skipped with `test.fixme()`, or left blocked.
- Any auth, data, environment, accessibility, responsive layout, or coverage gaps.

## Quality Checks

Before completion, verify:

- The plan and generated tests match the requested scope.
- Each generated test can run independently from a fresh state.
- Each generated test targets a user-visible UX risk, bug hypothesis, or regression.
- Gremlin mode tests include uncommon but safe interactions and verify recovery from the mayhem.
- Tests avoid brittle selectors, arbitrary sleeps, and hidden data dependencies.
- Assertions verify user outcomes, feedback, accessibility, or recoverability rather than implementation details.
- Mutating flows use safe test data only.
- Existing unrelated tests and files were not changed.

## Example Prompts

- "Use web-ux-gremlin to hunt for UX bugs in the checkout flow at http://localhost:3000."
- "Release the gremlins on onboarding and generate weird edge-case Playwright tests."
- "Run gremlin mode against account settings: try rapid clicks, odd form input, viewport changes, and recovery checks."
- "Generate and run Playwright tests for likely onboarding UX failures, then heal flaky failures."
- "Create a UX bug-hunt test plan only for account settings, including validation, recovery, and accessibility cases."
