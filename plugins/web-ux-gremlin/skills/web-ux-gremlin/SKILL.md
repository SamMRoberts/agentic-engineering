---
name: web-ux-gremlin
description: "Use when: planning, generating, running, or healing Playwright end-to-end tests with the web-ux-gremlin plugin. Use for: create Playwright test plans, generate Playwright specs, run tests, debug failures, and coordinate the playwright-test-planner, playwright-test-generator, and playwright-test-healer sub-agents."
argument-hint: "Target app or URL, flows to cover, auth/start state, and whether to plan, generate, run, or heal tests"
user-invocable: true
---

# Web UX Gremlin

## Purpose

Use this skill to create and run Playwright tests through the plugin's three stage agents:

- `playwright-test-planner` explores the target and saves a Markdown test plan.
- `playwright-test-generator` converts one plan scenario at a time into Playwright spec files.
- `playwright-test-healer` runs, debugs, edits, and verifies failing Playwright tests.

The workflow is planner -> generator -> test run -> healer -> report.

## Required Inputs

Collect or infer these before delegating:

- Target app URL or local app start instructions.
- Test goal, target area, or user flows to cover.
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

1. Check whether the plugin has Playwright setup: `package.json`, `playwright.config.ts`, `tests/`, and `specs/`.
2. If setup is missing and the user asked for setup, use the plugin requirements order:
   - `npm init playwright@latest`
   - `npx playwright init-agents --loop=vscode`
3. Identify the safest command for validation, usually `npx playwright test` or a targeted spec path.
4. Keep generated tests scoped to the requested target area.

## Procedure

### 1. Plan

Delegate to `playwright-test-planner` when the request needs a new or refreshed test plan.

Handoff should include:

```text
Target app or URL:
Scope / flows:
Auth and starting state:
Safety constraints:
Plan output path:
Out of scope:
```

Require the planner to save a Markdown plan under `specs/`. Review the plan before generation and ensure it has independent scenarios, clear steps, expected outcomes, negative cases, and safe assumptions.

### 2. Generate

Delegate to `playwright-test-generator` once per scenario that should become an automated test.

Use this handoff shape:

```xml
<test-suite>Top-level plan section name</test-suite>
<test-name>Scenario name</test-name>
<test-file>tests/path/to/scenario-name.spec.ts</test-file>
<seed-file>tests/seed.spec.ts or another seed file from the plan</seed-file>
<body>Scenario steps and expected outcomes from the saved plan</body>
```

Require one test per generated file unless the user explicitly asks for grouped specs. Prefer accessible locators, visible assertions, and comments that preserve the plan step text.

### 3. Run

Run the narrowest useful Playwright command after generation:

```bash
npx playwright test path/to/generated.spec.ts
```

For full-suite validation, use:

```bash
npx playwright test
```

Capture failing test names, file paths, browser/project names, and the first actionable error for healing.

### 4. Heal

Delegate failures to `playwright-test-healer` one failure at a time.

Handoff should include:

```text
Failing command:
Failing test file:
Failing test name:
Observed error:
Expected behavior:
Safety constraints:
```

Require the healer to rerun after each fix. Prefer robust selectors and assertions over timing workarounds. Do not use `networkidle`. If the app behavior is confidently different from the plan and the test is still valuable, allow `test.fixme()` only with a comment explaining the observed behavior.

### 5. Report

Finish with:

- Plan file created or reused.
- Test files created or changed.
- Commands run and pass/fail status.
- Failures healed, skipped with `test.fixme()`, or left blocked.
- Any auth, data, environment, or coverage gaps.

## Quality Checks

Before completion, verify:

- The plan and generated tests match the requested scope.
- Each generated test can run independently from a fresh state.
- Tests avoid brittle selectors, arbitrary sleeps, and hidden data dependencies.
- Mutating flows use safe test data only.
- Existing unrelated tests and files were not changed.

## Example Prompts

- "Use web-ux-gremlin to plan and generate Playwright tests for the checkout flow at http://localhost:3000."
- "Run the generated Playwright tests and heal any failures."
- "Create a test plan only for account settings, including validation and error cases."
