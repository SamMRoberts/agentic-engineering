---
name: gremlin-explain-scenario
description: "Deprecated: consolidated into gremlin-report. Use gremlin-report for scenario impact, expected recovery, findings, and recommended actions."
argument-hint: "Use gremlin-report; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Explain Scenario

## Deprecated

This skill has been consolidated into `gremlin-report` because scenario explanation now belongs in plan/report context.

## Replacement

Use gremlin-report for scenario impact, expected recovery, findings, and recommended actions.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-report` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
