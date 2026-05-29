---
name: run-playwright-cli-web-ux-test
description: 'Use when running exactly one generated Playwright CLI regression scenario, ARIA snapshot scenario, or selected web UX test from the terminal. Use for command selection, targeted execution, artifact capture, failure summaries, progress status, and mapping CLI failures back to scenario or finding IDs. Do not use for Playwright MCP browser exploration or broad multi-scenario runs.'
argument-hint: 'Provide one scenario ID or targeted test, current progress state, test command, test path, Playwright project/browser, report path, environment, and safety constraints.'
user-invocable: true
---

# Run Playwright CLI Web UX Test

Run one durable Playwright CLI test scenario created from a web UX scenario or finding and normalize the execution result for analysis.

## Required inputs

- One scenario ID, finding ID, grep pattern, test command, or test file path when known
- Current `web-ux-test/progress.md` state when available
- Target environment and base URL
- Playwright project, browser, or profile when known
- Scenario IDs, finding IDs, grep pattern, or target test directory
- Auth, fixture, and test data setup assumptions
- Safety limits for data mutation, production targets, and external side effects

If the command is missing, inspect package scripts, Playwright config, profiles, and generated test locations before choosing a default. Ask for confirmation before broad suite runs, production runs, or tests that may mutate real data.

## Procedure

1. Identify the narrowest safe command that exercises exactly one requested scenario, finding, file, project, or grep pattern.
2. Prefer package scripts when available. Common candidates include `npm test`, `npm run test:e2e`, `npm run playwright`, `npx playwright test`, or project-specific Playwright scripts.
3. Confirm that dependencies are installed. If the command cannot run because dependencies or Playwright browsers are missing, report the setup step instead of rewriting tests.
4. Run the selected command and capture exit code, key stdout/stderr excerpts, report paths, screenshots, traces, videos, and other artifacts.
5. Map failures back to scenario IDs or finding IDs using test titles, comments, file names, or generated metadata when possible.
6. Return scenario status and progress details so the orchestrator can update `web-ux-test/progress.md` before delegating the next scenario.
7. Do not diagnose beyond the supplied command output and artifacts. Hand off ambiguous failures to the results analyst.

## Safety rules

- Do not run destructive, production-targeted, or broad tests without explicit confirmation.
- Do not run more than one scenario per invocation.
- Do not print secrets from environment variables, config, traces, or logs.
- Do not use Playwright MCP browser tools for CLI execution.
- Prefer targeted commands over full-suite commands.

## Output

Return:

- command run
- working directory
- exit code
- scenario status for `web-ux-test/progress.md`
- passed, failed, skipped, timed-out, or interrupted status
- failing test titles and file paths
- mapped scenario or finding IDs
- artifact paths
- important stdout/stderr excerpts
- setup blockers
- recommended next agent: results analyst, report writer, or test file creator
