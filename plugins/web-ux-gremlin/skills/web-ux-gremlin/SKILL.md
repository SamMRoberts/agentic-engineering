---
name: web-ux-gremlin
description: "Use when: hunting for UX bugs with Playwright using the web-ux-gremlin plugin. Use for: discover user-visible failures, create UX bug-hunt test plans, generate Playwright specs, run tests, debug failures, and coordinate the playwright-test-planner, playwright-test-generator, and playwright-test-healer sub-agents."
argument-hint: "Target app or URL, UX flows or bug classes to hunt, auth/start state, and whether to plan, generate, run, or heal tests"
user-invocable: true
---

# Web UX Gremlin

## Purpose

The `web-ux-gremlin` plugin and this skill are for hunting UX bugs: broken user journeys, confusing states, validation gaps, inaccessible controls, regressions, and other user-visible failures. Use this skill to create and run Playwright tests through the plugin's three stage agents:

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
- Output locations, defaulting to `specs/` for plans and `tests/` for Playwright specs.

## Stop Conditions

Stop and ask for clarification when:

- No target app, URL, or already-running page is available.
- The flow would mutate production data or real accounts without explicit approval and safe fixtures.
- Authentication requires secrets that the user has not configured outside chat.
- The Playwright MCP tools or required stage agents are unavailable.
- The requested scope would overwrite existing tests without user approval.

Do not ask for passwords, API keys, cookies, or tokens in chat. Tell the user to configure those directly in their environment.

## Preflight

1. Confirm the current workspace root is the target Playwright project root containing `package.json`, `playwright.config.ts`, `tests/`, and `specs/`.
2. If setup is missing and the user asked for setup, use the plugin requirements order:
   - `npm init playwright@latest`
   - `npx playwright init-agents --loop=vscode`
3. If the target Playwright project is not the current workspace root, stop and tell the user to open that project as the workspace or restart the Playwright MCP server with `--config /absolute/path/to/playwright.config.ts`.
4. Identify the safest command for validation, usually `npx playwright test` or a targeted spec path, and run it from the target project root.
5. Keep generated tests scoped to the requested UX flows, risks, and bug hypotheses.

## Procedure

### 1. Plan

Delegate to `playwright-test-planner` when the request needs a new or refreshed UX bug-hunt plan.

Handoff should include:

```text
Target app or URL:
Scope / flows:
UX risks or bug classes to hunt:
Auth and starting state:
Safety constraints:
Plan output path:
Out of scope:
```

Require the planner to save a Markdown plan under `specs/`. Review the plan before generation and ensure it has independent scenarios, clear steps, expected outcomes, negative cases, safe assumptions, and explicit UX failure modes such as blocked paths, misleading feedback, missing validation, inaccessible controls, layout breakage, or confusing recovery states.

### 2. Generate

Delegate to `playwright-test-generator` once per UX bug-hunt scenario that should become an automated test.

Use this handoff shape:

```xml
<test-suite>Top-level plan section name</test-suite>
<test-name>Scenario name</test-name>
<test-file>tests/path/to/scenario-name.spec.ts</test-file>
<seed-file>tests/seed.spec.ts or another seed file from the plan</seed-file>
<body>Scenario steps, expected outcomes, and UX failure mode from the saved plan</body>
```

Require one test per generated file unless the user explicitly asks for grouped specs. Prefer accessible locators, visible assertions, and comments that preserve the plan step text. Assertions should check user-visible behavior and UX outcomes rather than internal implementation details.

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
- Tests avoid brittle selectors, arbitrary sleeps, and hidden data dependencies.
- Assertions verify user outcomes, feedback, accessibility, or recoverability rather than implementation details.
- Mutating flows use safe test data only.
- Existing unrelated tests and files were not changed.

## Example Prompts

- "Use web-ux-gremlin to hunt for UX bugs in the checkout flow at http://localhost:3000."
- "Generate and run Playwright tests for likely onboarding UX failures, then heal flaky failures."
- "Create a UX bug-hunt test plan only for account settings, including validation, recovery, and accessibility cases."
