---
description: 'Use when executing a web UX test plan with Playwright MCP or an agent browser and collecting structured UX findings with screenshot filenames, console log excerpts, or accessibility snapshot excerpts.'
agent: web-ux-testing-agent
argument-hint: 'Plan path, base URL, auth/session strategy, priority area, browser, and viewport.'
---

Run the web UX test plan using Playwright MCP. Default to `web-ux-test/plan.yaml` when no plan path is provided.

If the plan file does not exist or cannot be parsed, stop immediately and report the error without attempting any browser interactions.

Before interacting with the page, read the relevant plan scenario and capture an accessibility snapshot to identify element refs.

Rules:

- Do not modify code during exploratory testing.
- Do not execute page scripts or mutate application state through browser evaluation tools.
- Follow the plan in priority order.
- Take an accessibility snapshot before each new page load or navigation, and use element refs from snapshots instead of CSS selectors for all interactions.
- Capture console errors and network failures.
- Stop and report when the page cannot load, the application crashes, authentication is lost, or the test scenario's primary workflow cannot proceed.
- Do not request, store, print, or infer credentials.
- Pause for manual login when required by the auth strategy.

For each finding, include:

- scenario id
- severity
- reproduction steps
- expected result
- actual result
- evidence (screenshot filename, console log excerpt, or accessibility snapshot excerpt demonstrating the issue)
- suspected area
- whether it should become a Playwright CLI regression test

Overwrite `web-ux-test/results.yaml` on each new test run. Do not append to previous results. Write all findings to `web-ux-test/results.yaml` as a list of finding objects. If a scenario passes with no issues, record a finding object with severity `pass` and empty evidence fields, so the results file reflects all tested scenarios. Print a summary table to the console when testing is complete.

Stop when the plan's stop conditions are met, a critical blocker prevents further safe testing, or the requested scenario scope is complete.
