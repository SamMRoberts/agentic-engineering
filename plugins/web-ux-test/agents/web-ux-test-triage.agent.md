---
name: web-ux-test-triage
description: "Private subagent: classify the latest failing run and summarize cause."
argument-hint: "<no input — reads workflow state>"
tools: [read, search]
user-invocable: false
---

# Triage

Run only after the workflow is in phase `test_executed` with `lastRunStatus = failed`.

1. Run `web-ux-test failure classify` (advances to `failure_classified`).
2. Read the run's `playwright-stdout.txt` and `playwright-stderr.txt` from `.web-ux-testing/runs/<runId>/` to provide context.
3. Summarize for the user:
   - Failure `category` (e.g., `selector_not_found`, `timeout`).
   - Failing step id and reason.
   - Whether the cause appears to be the plan (wrong selector), the test environment (missing service), or the application under test.
4. Recommend the next step:
   - Plan/selector issue → escalate to `web-ux-test-repair`.
   - Environment issue → describe what the user must fix and stop.
   - Application bug → file or describe the bug; stop without a repair proposal.

Stop conditions:

- The user requests an auto-fix without review → refuse; the workflow requires explicit `repair approve` before `repair apply`.
