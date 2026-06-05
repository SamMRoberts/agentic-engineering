---
name: web-ux-gremlin-heal
description: "Private helper for web-ux-gremlin. Use only to triage a failing UX bug-hunt Playwright test, repair test defects, and classify product UX bugs versus selector, setup, or environment failures."
argument-hint: "Failing command, file, test name, observed error, expected behavior, suspected UX bug, healer tools, run contract"
user-invocable: false
---

# Web UX Gremlin Heal

Handle one failing test at a time.

## Procedure

1. Use the heal handoff from `../web-ux-gremlin/checklists/stage-handoffs.md`.
2. Start with `test_run` when available to identify current failures; otherwise reproduce with the narrowest failing command.
3. For each failing test, run `test_debug` when available before editing.
4. When execution pauses or fails, inspect the error, browser snapshot, console messages, network requests, locator candidates, timing, assertions, data dependencies, environment assumptions, and recent application behavior.
5. Classify root cause as `product`, `test`, `selector`, or `environment`.
6. Fix one issue at a time. For test defects, update selectors, assertions, expected values, setup, synchronization, or resilient regular-expression locators without weakening the UX objective.
7. Prefer robust, maintainable Playwright patterns. Never wait for `networkidle` or use discouraged/deprecated APIs.
8. Rerun after every fix with `test_run` or the narrowest equivalent command. Repeat until the scoped test passes cleanly or a blocker is classified.
9. For product UX bugs, preserve the finding. If confidence is high that the test is correct and product behavior diverges, use `test.fixme()` only with a comment before the failing step explaining what happens instead of the expected behavior.
10. Do not stop to ask user questions during healing; choose the most reasonable safe fix within the run contract and record assumptions.

## Output

Return root cause, findings and reasoning, files changed, rerun command/status, UX findings, fixme usage, and unresolved blockers.
