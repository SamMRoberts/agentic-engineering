# Web UX Gremlin

Web UX Gremlin is a Playwright-focused agent plugin for finding user-visible web UX failures. It helps an agent plan, generate, run, and repair frontend tests that exercise broken journeys, confusing states, validation gaps, accessibility problems, recovery failures, and regressions.

The plugin has two operating styles:

- **Standard bug hunt** for realistic user journeys, regression coverage, negative cases, and accessibility checks.
- **Gremlin mode** for unusual but safe UX pressure: rapid clicks, duplicated submits, strange input, viewport changes, interrupted navigation, keyboard-only flows, stale tabs, offline retries, and other deterministic edge cases.

Gremlin mode is intentionally not random fuzzing. It should produce reproducible Playwright tests that target a named UX risk and verify that the user can still understand, recover, or complete the flow safely.

## What It Provides

- A user-invocable `web-ux-gremlin` skill under `skills/web-ux-gremlin/SKILL.md`.
- A gremlin-mode checklist under `skills/web-ux-gremlin/checklists/gremlin-mode.md`.
- A Playwright project scaffold with `playwright.config.ts`, `tests/`, and `specs/`.
- MCP configuration for Playwright test tooling in `.mcp.json`.
- Host plugin manifests for Codex, Claude, and GitHub-style plugin discovery.
- GitHub workflow examples for Playwright execution and Copilot setup.
- Node test coverage for the skill's gremlin-mode requirements.

## Workflow

The intended workflow is:

1. **Plan** - create or reuse a Markdown UX bug-hunt plan under `specs/`.
2. **Generate** - convert one scoped scenario at a time into a Playwright spec under `tests/`.
3. **Run** - execute the narrowest useful Playwright command from the target project root.
4. **Heal** - debug failing tests, separating real product UX bugs from brittle selectors, setup mistakes, or environment issues.
5. **Report** - summarize created files, commands run, pass/fail status, UX bugs found, blocked cases, and residual coverage gaps.

Generated tests should prefer accessible locators, visible assertions, deterministic setup, and user-observable outcomes. They should avoid arbitrary sleeps, pixel coordinates, hidden implementation details, uncontrolled load, and production data.

## Gremlin Mode

Use gremlin mode when the goal is to stress UX resilience rather than only replay expected paths. Good gremlin-mode scenarios name:

- The unusual user behavior being simulated.
- The UX failure mode the scenario is trying to expose.
- The safety boundary for the test data or account.
- The recovery expectation after the gremlin action.

Examples of gremlin tactics include:

- Double-clicking submit and verifying only one visible result occurs.
- Pasting emoji, right-to-left text, long strings, whitespace-only values, or special characters into forms.
- Resizing the viewport or switching device profiles mid-flow.
- Pressing Escape inside dialogs, menus, date pickers, and popovers.
- Navigating back, forward, or reload during a multi-step flow.
- Simulating offline and online transitions for retryable actions.
- Completing flows with keyboard-only navigation and checking focus recovery.

## Install

From this plugin directory:

```bash
cd plugins/web-ux-gremlin
npm install
npx playwright install
```

For CI environments that need browser system dependencies, use:

```bash
npx playwright install --with-deps
```

The plugin manifest also records the expected setup order for a fresh Playwright agent workspace:

```bash
npm init playwright@latest
npx playwright init-agents --loop=vscode
```

## Agent Usage

In a host that supports this plugin, invoke the `web-ux-gremlin` skill with the target app, scope, mode, auth assumptions, and desired stage.

Example prompts:

```text
Use web-ux-gremlin to hunt for UX bugs in the checkout flow at http://localhost:3000.
```

```text
Release the gremlins on onboarding. Generate unusual edge-case Playwright tests and run them.
```

```text
Create a UX bug-hunt plan only for account settings, including validation, recovery, accessibility, and safe gremlin-mode cases.
```

```text
Run gremlin mode against profile editing: try rapid clicks, odd form input, viewport changes, keyboard navigation, and recovery checks.
```

Provide these inputs when they matter:

- Target URL or local app start instructions.
- Target flows or UX bug classes.
- Auth model and safe test account setup.
- Starting state, seed data, and destructive-action policy.
- Whether the requested stage is plan only, generate, run, heal, or full workflow.
- Whether to use standard bug hunt mode or gremlin mode.

Do not put passwords, API keys, cookies, tokens, or other secrets in chat. Configure them directly in the environment used by the browser or test runner.

## Manual Playwright Usage

Create test plans in `specs/` and executable Playwright specs in `tests/`.

Run a generated spec:

```bash
npx playwright test tests/path/to/generated.spec.ts
```

Run the whole suite:

```bash
npx playwright test
```

Run the plugin's Node tests:

```bash
npm test
```

Playwright commands should be run from the target Playwright project root so the correct `playwright.config.ts` and test runner instance are used.

## MCP Configuration

`.mcp.json` defines a `playwright-test` MCP server using:

```bash
npx playwright run-test-mcp-server --config playwright.config.ts
```

Use this when the host supports MCP-backed Playwright testing. If the target app lives outside this plugin directory, open the target project as the workspace or configure the MCP server with the target project's absolute `playwright.config.ts` path.

## Repository Layout

```text
plugins/web-ux-gremlin/
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json
  .github/plugin/plugin.json
  .github/workflows/
  .mcp.json
  package.json
  playwright.config.ts
  plugin.json
  skills/web-ux-gremlin/
    SKILL.md
    checklists/gremlin-mode.md
  specs/
  test/
  tests/
```

`specs/` is for saved UX bug-hunt plans. `tests/` is for Playwright specs. `test/` contains Node tests for plugin authoring checks.

## Safety Boundaries

Web UX Gremlin should fail closed when scope or safety is unclear.

Stop before running tests when:

- No target app, URL, or already-running page is available.
- The flow would mutate production data, real accounts, money movement, or irreversible state without explicit approval and safe fixtures.
- Authentication requires secrets that are not already configured outside chat.
- The requested workflow would overwrite existing tests without user approval.
- Required Playwright tooling or MCP support is unavailable.

Gremlin mode should remain deterministic, bounded, and safe. It is for UX resilience testing, not denial-of-service testing, credential probing, production mutation, or uncontrolled fuzzing.

## Current Implementation Notes

The checked-in behavior currently lives in the `web-ux-gremlin` skill, gremlin-mode checklist, Playwright configuration, MCP configuration, and tests. The host manifests include metadata for agent-based workflows and reference private Playwright stage agents, so verify those host-specific agents are installed before depending on delegated planner, generator, or healer behavior in a given environment.

