---
name: gremlin-test-strategy-advisor
description: "Deprecated: consolidated into gremlin-plan. Use gremlin-plan to capture strategy notes, baseline context, safety constraints, and coverage priorities in the plan artifact."
argument-hint: "Use gremlin-plan; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Test Strategy Advisor

## Deprecated

This skill has been consolidated into `gremlin-plan` because strategy and coverage scoping now belong in the plan phase.

## Replacement

Use gremlin-plan to capture strategy notes, baseline context, safety constraints, and coverage priorities in the plan artifact.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-plan` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
