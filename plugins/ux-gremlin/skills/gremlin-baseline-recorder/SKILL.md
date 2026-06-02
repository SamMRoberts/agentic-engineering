---
name: gremlin-baseline-recorder
description: "Deprecated: consolidated into gremlin-plan. Use gremlin-plan to capture the happy-path baseline before adding gremlin scenarios."
argument-hint: "Use gremlin-plan; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Baseline Recorder

## Deprecated

This skill has been consolidated into `gremlin-plan` because baseline capture now belongs in the plan phase.

## Replacement

Use gremlin-plan to capture the happy-path baseline before adding gremlin scenarios.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-plan` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
