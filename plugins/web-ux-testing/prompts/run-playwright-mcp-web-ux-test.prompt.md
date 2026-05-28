---
description: 'Use when executing a web UX test plan with Playwright MCP or an agent browser and collecting structured UX findings with evidence.'
agent: web-ux-testing-agent
argument-hint: 'Plan path, base URL, auth/session strategy, priority area, browser, and viewport.'
---

Run the web UX test plan using Playwright MCP. Default to `web-ux-test/plan.yaml` when no plan path is provided.

Before interacting with the page, read the relevant plan scenario and capture an accessibility snapshot to identify element refs.

Rules:

- Do not modify code during exploratory testing.
- Do not execute page scripts or mutate application state through browser evaluation tools.
- Follow the plan in priority order.
- Use accessibility snapshots where possible.
- Capture console errors and network failures.
- Stop and report critical failures that block further testing.
- Do not request, store, print, or infer credentials.
- Pause for manual login when required by the auth strategy.

For each finding, include:

- scenario id
- severity
- reproduction steps
- expected result
- actual result
- evidence
- suspected area
- whether it should become a Playwright CLI regression test

Stop when the plan's stop conditions are met, a critical blocker prevents further safe testing, or the requested scenario scope is complete.
