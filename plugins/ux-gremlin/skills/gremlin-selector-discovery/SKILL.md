---
name: gremlin-selector-discovery
description: "Deprecated: consolidated into gremlin-generate-playwright. Use gremlin-generate-playwright for recipe-backed locator generation, then gremlin-execute-tests for readiness checks."
argument-hint: "Use gremlin-generate-playwright; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Selector Discovery

## Deprecated

This skill has been consolidated into `gremlin-generate-playwright` because selector and recipe guidance now belongs in Playwright generation and execution readiness.

## Replacement

Use gremlin-generate-playwright for recipe-backed locator generation, then gremlin-execute-tests for readiness checks.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-generate-playwright` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
