---
name: run-playwright-mcp-web-ux-test
description: 'Use when executing a validated web UX test plan or specific validated scenario with Playwright MCP or an agent browser. Use for formal plan/scenario execution, collecting structured UX findings, screenshots, console errors, network failures, accessibility snapshots, and writing web-ux-test/results.yaml. Do not use for open-ended exploratory discovery or Playwright CLI regression test generation.'
argument-hint: 'Provide the plan path, scenario ID or priority area, base URL, auth/session strategy, browser, viewport, and safety limits.'
user-invocable: true
---

# Run Playwright MCP Web UX Test

Execute a validated web UX test plan or specific validated scenario with Playwright MCP or an agent browser and collect structured findings without modifying application code.

## Required inputs

- Plan path, defaulting to `web-ux-test/plan.yaml`
- Scenario ID, priority area, or explicit scenario scope
- Base URL or target environment
- Auth/session strategy, including manual-login pause when required
- Browser and viewport when specified by the plan
- Safety limits for destructive actions, sends, purchases, deletes, or admin operations

If the plan file does not exist or cannot be parsed, stop immediately and report the error without attempting browser interactions.

If the user asks for open-ended exploration without a validated plan or scenario, use `skills/explore-web-ux-with-playwright-mcp/SKILL.md` instead.

## Procedure

1. Read the relevant plan scenario and confirm it is validation-ready. Do not execute plans with known schema errors unless the user narrows the run to a validated scenario.
2. Confirm auth and safety boundaries before navigating. Do not request, store, print, or infer credentials.
3. Navigate with Playwright MCP browser tools and take an accessibility snapshot before each new page load or navigation.
4. Use element refs from accessibility snapshots for interactions instead of CSS selectors.
5. Follow the plan in priority order unless the user requested a specific scenario.
6. Capture console errors, network failures, screenshots, URLs, and accessibility snapshot excerpts as evidence.
7. Stop when the plan's stop conditions are met, a critical blocker prevents further safe testing, or the requested scenario scope is complete.
8. Write findings to `web-ux-test/results.yaml` as a list of finding objects matching `schemas/web-ux-finding.schema.yaml`.
9. Print a summary table when testing is complete, including severity, scenario ID, title, and whether each finding should become a Playwright CLI regression test.

## Browser rules

- Do not modify application code during plan or scenario execution.
- Do not execute page scripts or mutate application state through browser evaluation tools.
- Pause for manual login when required by the auth strategy.
- Stop and report critical safety, auth, data-loss, or destructive-action blockers.
- Prefer observable user-facing behavior over implementation guesses.

## Finding fields

Each finding should include:

- `id`
- `scenario_id`
- `severity`: `critical`, `high`, `medium`, or `low`
- `title`
- `status`: usually `open` or `needs_triage`
- `environment`
- `runner`: `playwright-mcp` or `agent-built-in-browser`
- `reproduction_steps`
- `expected_result`
- `actual_result`
- `evidence`: screenshot filenames, console log excerpts, network failures, URLs, ARIA snapshots, or accessibility snapshot excerpts demonstrating the issue
- `suspected_area`
- `recommended_next_step`
- `convert_to_regression_test`

Do not invent evidence. If evidence is missing, record the missing evidence in the summary instead of fabricating a finding detail.