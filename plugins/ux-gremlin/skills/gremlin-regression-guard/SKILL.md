---
name: gremlin-regression-guard
description: "Deprecated: consolidated into gremlin-report. Use gremlin-report with run history enabled to compare current results against previous runs."
argument-hint: "Use gremlin-report; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Regression Guard

## Deprecated

This skill has been consolidated into `gremlin-report` because trend and regression signals now belong in reporting.

## Replacement

Use gremlin-report with run history enabled to compare current results against previous runs.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-report` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
