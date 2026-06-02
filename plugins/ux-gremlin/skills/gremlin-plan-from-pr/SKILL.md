---
name: gremlin-plan-from-pr
description: "Deprecated: consolidated into gremlin-plan. Use gremlin-plan with changed route/component context from the PR."
argument-hint: "Use gremlin-plan; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Plan From Pr

## Deprecated

This skill has been consolidated into `gremlin-plan` because PR-aware planning now belongs in the normal plan phase.

## Replacement

Use gremlin-plan with changed route/component context from the PR.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-plan` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
