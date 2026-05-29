---
name: run-playwright-mcp-web-ux-test
description: 'Use when executing exactly one validated web UX test scenario with Playwright MCP or an agent browser. Use for formal scenario execution, collecting structured UX findings, screenshots, console errors, network failures, accessibility snapshots, updating progress status, and writing web-ux-test/results.yaml. Do not use for open-ended exploratory discovery, multi-scenario runs, or Playwright CLI regression test generation.'
argument-hint: 'Provide the plan path, one scenario ID, current progress state, base URL, auth/session strategy, browser, viewport, and safety limits.'
user-invocable: true
---

# Run Playwright MCP Web UX Test

Execute exactly one validated web UX test scenario with Playwright MCP or an agent browser and collect structured findings without modifying application code.

## Required inputs

- Plan path, defaulting to `web-ux-test/plan.yaml`
- One scenario ID or explicit single-scenario scope
- Current `web-ux-test/progress.md` state when available
- Base URL or target environment
- Auth/session strategy, including manual-login pause when required
- Browser and viewport when specified by the plan
- Safety limits for destructive actions, sends, purchases, deletes, or admin operations

If the plan file does not exist or cannot be parsed, stop immediately and report the error without attempting browser interactions.

If the user asks for open-ended exploration without a validated plan or scenario, use `skills/explore-web-ux-with-playwright-mcp/SKILL.md` instead.

## Runner selection

- Use this skill by default when the user asks to run, test, check, or validate a web UX scenario and does not specify a runner.
- Use Playwright MCP or an explicit agent browser for browser execution and evidence capture.
- Do not use this skill for Playwright CLI regression generation, existing CLI commands, CI test runs, or ARIA baseline execution.

## Procedure

1. Read the relevant plan scenario and confirm it is validation-ready. Do not execute plans with known schema errors unless the user narrows the run to one validated scenario.
2. Confirm auth and safety boundaries before navigating. Do not request, store, print, or infer credentials.
3. Navigate with Playwright MCP browser tools and take an accessibility snapshot before each new page load or navigation.
4. Use element refs from accessibility snapshots for interactions instead of CSS selectors.
5. Follow the plan in priority order unless the user requested a specific scenario.
6. Capture console errors, network failures, screenshots, URLs, and accessibility snapshot excerpts as evidence.
7. Stop when the scenario's stop conditions are met, the plan's stop conditions are met, a critical blocker prevents further safe testing, or the requested single-scenario scope is complete.
8. Write findings to `web-ux-test/results.yaml` as a list of finding objects matching `schemas/web-ux-finding.schema.yaml`.
9. Return scenario status and progress details so the orchestrator can update `web-ux-test/progress.md` before delegating the next scenario.

## Browser rules

- Do not modify application code during plan or scenario execution.
- Do not run more than one scenario per invocation.
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