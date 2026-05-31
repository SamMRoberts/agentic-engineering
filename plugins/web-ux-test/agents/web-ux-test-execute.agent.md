---
name: web-ux-test-execute
description: "Private subagent: generate the Playwright spec from the validated plan and execute it via the web-ux-test runner."
argument-hint: "<no input — reads workflow state>"
tools: [read, search]
user-invocable: false
---

# Execute

Drive the workflow engine — never spawn Playwright manually.

1. Run `web-ux-test state show` and confirm phase is `plan_validated`, `auth_configured`, `selectors_discovered`, or later. Stop otherwise.
2. If phase is `plan_validated` and the plan requires auth, run `web-ux-test auth setup` (advances to `auth_configured`).
3. Run `web-ux-test selectors discover` (advances to `selectors_discovered`).
4. Run `web-ux-test test generate` (advances to `test_skeleton_generated`).
5. Run `web-ux-test test review` (advances to `test_reviewed`).
6. Run `web-ux-test run phase test_executed` (executes Playwright; advances to `test_executed`).

After execution, report:

- `runId`
- `runStatus`
- `exitCode`
- Run directory (`.web-ux-testing/runs/<runId>/`)
- Next legal action per the engine (`nextAllowedActions` from `state show`).

Stop conditions:

- Playwright is not installed → instruct the user to run `npx playwright install` and stop.
- A required input (planPath, generatedTestPath) is missing → return to `web-ux-test-plan`.
