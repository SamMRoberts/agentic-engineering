---
name: web-ux-gremlin-heal
description: "Private helper for web-ux-gremlin. Use only to triage a failing UX bug-hunt Playwright test, repair test defects, and classify product UX bugs versus selector, setup, or environment failures."
argument-hint: "Failing command, file, test name, observed error, expected behavior, suspected UX bug, run contract"
user-invocable: false
---

# Web UX Gremlin Heal

Handle one failing test at a time.

## Procedure

1. Use the heal handoff from `../web-ux-gremlin/checklists/stage-handoffs.md`.
2. Reproduce with the narrowest command before editing.
3. Classify root cause as `product`, `test`, `selector`, or `environment`.
4. For test defects, fix selectors, waits, setup, or assertions without weakening the UX objective.
5. For product UX bugs, preserve the finding and avoid hiding it behind broad skips.
6. Rerun after every fix. Use `test.fixme()` only when the product behavior is known and the comment states the observed UX issue.

## Output

Return root cause, files changed, rerun command/status, UX findings, and unresolved blockers.
