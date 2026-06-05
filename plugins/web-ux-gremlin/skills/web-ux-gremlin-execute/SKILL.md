---
name: web-ux-gremlin-execute
description: "Private helper for web-ux-gremlin. Use only to run scoped Playwright UX bug-hunt specs, capture actionable failures, and preserve command evidence for reporting."
argument-hint: "Target project root, generated spec path or suite command, browser/tool choice, run contract"
user-invocable: false
---

# Web UX Gremlin Execute

Run Playwright from the target project root with the narrowest useful command.

## Procedure

1. Confirm the run contract and session-ready checkpoint for headed/authenticated runs.
2. Run a single generated spec before a full suite unless the run contract says `run_mode=full`.
3. Capture command, test file, test name, browser/project, status, duration, and the first actionable error.
4. Treat failures as possible UX bugs until healing classifies them.
5. Do not switch runner, browser, project root, or scope silently.

## Output

Return pass/fail status, command evidence, failure list, artifacts, and the next healer handoff if needed.
