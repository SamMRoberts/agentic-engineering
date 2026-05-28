---
name: generate-web-ux-test-plan
description: 'Use when creating, refining, or extending structured YAML web UX testing plans for Playwright MCP, agent browsers, Playwright CLI, or hybrid discovery-to-regression workflows. Use for app UX test plans, exploratory browser testing plans, accessibility coverage, responsive checks, auth/session plans, error-state coverage, and CI regression candidates. Do not use for writing Playwright test code from an already-stable scenario; use convert-web-ux-plan-to-playwright-tests instead.'
argument-hint: 'Describe the app, URL, auth strategy, key workflows, risk areas, and runner type.'
user-invocable: true
---

# Generate Web UX Test Plan

Create a schema-aligned web UX testing plan that can guide exploratory Playwright MCP testing and identify candidates for durable Playwright CLI regression tests.

## Required inputs

Collect these inputs from the user, infer them from repository context only when confidence is high, or mark them as `unknown` with a follow-up question when they affect safety or execution:

- Application name
- Base URL
- Environment: local, dev, staging, production
- Auth requirement
- Auth strategy
- Primary user roles
- Critical user workflows
- Known UX risk areas
- Browser coverage
- Device/responsive coverage
- Data setup needs
- Destructive action policy
- External service limits
- Preferred test id attribute
- Execution mode: Playwright MCP, built-in agent browser, Playwright CLI, or hybrid

Ask before generating when any of these are missing: base URL, whether auth is required, credentials handling policy, destructive action policy, and the workflows in scope. Do not fill these with unstated assumptions.

## Procedure

1. Define scope first: in-scope pages/workflows, out-of-scope or unsafe actions, target environment, and whether production data is involved.
2. Choose a runner default: use `playwright-mcp` for exploratory browser testing, `hybrid` when the user wants discovery plus regression candidates, and `playwright-cli` only when the plan is meant for repeatable automation.
3. Set auth explicitly. Never store credentials in YAML; use `saved_browser_session`, `manual_login_pause`, `test_user`, environment variables, or a secret manager policy.
4. Generate the plan from the scaffold shape below and keep scenarios observable: decision signals, expected checks, issue indicators, evidence, and stop conditions.
5. Add conditional branches for auth state, loading state, modals, permissions, feature flags, empty states, API failures, and responsive breakpoints when they can affect the journey.
6. Mark stable, high-value scenarios with `convert_to_regression_test: true`; keep exploratory-only scenarios out of CI recommendations.
7. Validate the resulting plan with `npm run validate:plan -- web-ux-test/plan.yaml` or `node scripts/validate-plan.mjs web-ux-test/plan.yaml`, then revise until errors are cleared. Treat warnings as risks that must be fixed or explicitly reported.

## Output requirements

Generate YAML files using `schemas/web-ux-test-plan.schema.yaml`.

Validation is strict. Every generated scenario must include evidence and `stop_conditions`, and must include at least one of `steps` or `branches`. Plans with validation errors are not ready for browser execution or Playwright CLI conversion.

Prefer this structure:

```text
web-ux-test/
  plan.yaml
  config.yaml
  areas/
    authentication.yaml
    navigation.yaml
    forms.yaml
    workflows.yaml
    accessibility.yaml
    responsive.yaml
    error-states.yaml
```

## Plan style

Write exploratory UX test plans, not brittle scripts.

Use:

- goals
- scenarios
- observable signals
- checks
- branches
- issue indicators
- evidence requirements
- failure handling

Avoid:

- pixel coordinates
- fixed sleep waits
- hard-coded credentials
- production-destructive actions
- vague checks like "looks good"
- test steps that depend on hidden implementation details

Prefer role, label, text, and configured test-id selectors in scenario wording. Avoid CSS selectors unless the app lacks accessible or stable selectors.

## Required scenario fields

Each scenario must include:

- id
- title
- priority
- goal
- entry
- steps or branches
- checks
- issue_indicators
- evidence
- stop_conditions

## Review before returning

Include a short review section identifying:

- missing test IDs
- fragile flows
- missing accessibility checks
- missing API/network validation
- missing error-state coverage
- unclear auth/session strategy
- scenarios that should become durable Playwright CLI tests

Also state whether validation was run and summarize any remaining warnings.

## ARIA snapshot coverage

When accessibility, semantic structure, or ARIA testing is requested, include ARIA snapshot scenarios for stable pages, regions, forms, dialogs, menus, and components.

Add these fields when useful:

- `aria.snapshot_scope`
- `aria.baseline_name`
- `aria.dynamic_content_policy`
- `aria.recommended_assertion`

Prefer small, locator-scoped snapshots and mark stable ARIA scenarios as Playwright CLI regression candidates.
