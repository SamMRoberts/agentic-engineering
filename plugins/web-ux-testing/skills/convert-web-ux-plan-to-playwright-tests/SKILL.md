---
name: convert-web-ux-plan-to-playwright-tests
description: 'Use when converting stable web UX scenarios, exploratory findings, or regression candidates into durable Playwright CLI tests. Use for test code generation, fixtures, test data notes, auth setup assumptions, ARIA snapshot assertions, and bug reproduction tests from confirmed UX issues. Do not use for exploratory Playwright MCP execution or broad plan creation.'
argument-hint: 'Provide scenario/finding IDs, plan path, target test directory, auth/data setup, and expected regression behavior.'
user-invocable: true
---

# Convert Web UX Plan to Playwright Tests

Convert stable exploratory scenarios or confirmed findings into repeatable Playwright CLI tests suitable for local runs and CI.

## Required inputs

- Source plan, area file, scenario, or finding IDs
- Target app base URL and test environment
- Authentication strategy and test data setup
- Desired test file location or repository test convention
- Expected behavior and known issue reproduction details

If the scenario depends on manual login, production-only data, nondeterministic timing, or destructive actions, do not convert it directly. Recommend a fixture, test user, mocked auth, or a narrower regression case first.

## Procedure

1. Select only scenarios marked stable or `convert_to_regression_test: true`, plus confirmed bugs with a minimal reproduction path.
2. Translate exploratory steps into deterministic arrange-act-assert flow. Replace observations like "check page works" with explicit assertions.
3. Prefer locators in this order: role, label, text for stable visible names, configured test ID, then CSS only as a last resort.
4. Isolate setup through fixtures, test users, mocked auth, or seeded data. Avoid production data and shared mutable state.
5. Handle async UI with web-first assertions instead of fixed sleeps.
6. Keep each test focused on one behavior. Split long exploratory journeys into smaller tests when assertions cover different risks.
7. Provide the command to run the generated tests and note assumptions that must be satisfied before CI use.

Use `templates/playwright-test.template.ts` as the shape for standard tests and `templates/aria-snapshot-test.template.ts` for ARIA snapshot tests when helpful.

## Conversion rules

- Convert high-value exploratory scenarios into repeatable Playwright tests.
- Prefer role, label, text, and test-id locators.
- Avoid coordinates and arbitrary waits.
- Use explicit assertions.
- Capture regression behavior.
- Keep setup isolated.
- Avoid depending on production data.
- Use test users or mocked auth where appropriate.
- Preserve bug reproduction details in comments only when useful.

## Output

Generate:

- source scenario or finding id
- target test file path
- test code
- required fixtures
- required test data
- command to run the test
- assumptions or limitations

When editing repository files, also include any fixture or config changes needed by the tests. Keep bug reproduction comments short and tied to the scenario or issue ID.

## ARIA snapshot conversion

For scenarios with `aria` metadata or `evidence` containing `aria_snapshot`, generate Playwright tests using:

- `expect(page).toMatchAriaSnapshot()` for stable app shells only
- `expect(locator).toMatchAriaSnapshot()` for forms, dialogs, menus, regions, and components

Use named `.aria.yml` baselines. Do not auto-accept baseline changes without review.
