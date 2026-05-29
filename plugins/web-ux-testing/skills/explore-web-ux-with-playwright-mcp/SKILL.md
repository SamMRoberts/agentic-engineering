---
name: explore-web-ux-with-playwright-mcp
description: 'Use when performing open-ended exploratory web UX discovery with Playwright MCP or an agent browser. Use for ad hoc browser exploration, workflow discovery, UX issue discovery, evidence capture, and follow-up scenario recommendations. Do not use for executing validated test plans, validated scenarios, or Playwright CLI tests.'
argument-hint: 'Provide base URL, exploration scope, auth/session strategy, safety limits, browser, viewport, and output path.'
user-invocable: true
---

# Explore Web UX With Playwright MCP

Perform exploratory web UX discovery with Playwright MCP or an agent browser when the user wants to find issues rather than execute a validated plan.

## Required inputs

- Base URL or target environment
- Exploration scope: pages, workflows, roles, risk areas, responsive scope, or accessibility focus
- Auth/session strategy, including manual-login pause when required
- Safety limits for destructive actions, sends, purchases, deletes, admin operations, and external side effects
- Browser and viewport when specified
- Output location, defaulting to `web-ux-test/results.yaml`

If base URL, auth strategy, safety limits, or exploration scope are missing, ask before navigating. Do not infer credentials or destructive-action permission.

## Procedure

1. Confirm exploration scope, auth strategy, safety limits, browser, and viewport.
2. Navigate with Playwright MCP browser tools and take an accessibility snapshot before each new page load or navigation.
3. Use element refs from accessibility snapshots for interactions instead of CSS selectors.
4. Explore scoped workflows using observable user-facing behavior, not implementation guesses.
5. Capture console errors, network failures, screenshots, URLs, and accessibility snapshot excerpts as evidence.
6. Record findings in `web-ux-test/results.yaml` as exploratory finding objects matching `schemas/web-ux-finding.schema.yaml` where possible.
7. Recommend follow-up plan scenarios for any high-value gaps, blockers, or regression candidates discovered.

## Browser rules

- Do not modify application code during exploratory testing.
- Do not execute page scripts or mutate application state through browser evaluation tools.
- Pause for manual login when required by the auth strategy.
- Stop and report critical safety, auth, data-loss, destructive-action, or external side-effect blockers.
- Do not claim formal plan coverage or scenario completion.

## Output

Return:

- exploration scope covered
- findings written or proposed
- evidence captured
- blockers encountered
- missing evidence
- recommended follow-up scenarios
- recommended regression candidates

Do not invent evidence. If evidence is missing, record the missing evidence in the summary instead of fabricating a finding detail.