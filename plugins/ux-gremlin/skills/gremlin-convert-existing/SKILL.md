---
name: gremlin-convert-existing
description: "Deprecated: consolidated into gremlin-plan. Use gremlin-plan to convert an existing Playwright/Cypress happy path into baseline_flow and gremlin_scenarios."
argument-hint: "Use gremlin-plan; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Convert Existing

## Deprecated

This skill has been consolidated into `gremlin-plan` because existing test conversion now starts by capturing the existing happy path as a plan baseline.

## Replacement

Use gremlin-plan to convert an existing Playwright/Cypress happy path into baseline_flow and gremlin_scenarios.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-plan` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
