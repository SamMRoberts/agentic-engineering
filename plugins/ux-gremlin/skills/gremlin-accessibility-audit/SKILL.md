---
name: gremlin-accessibility-audit
description: "Deprecated: consolidated into gremlin-plan. Use gremlin-plan to add keyboard, focus, ARIA, and screen-reader gremlin coverage; use gremlin-report for executed accessibility findings."
argument-hint: "Use gremlin-plan; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Accessibility Audit

## Deprecated

This skill has been consolidated into `gremlin-plan` because accessibility coverage now belongs in planning and reporting instead of a separate stub.

## Replacement

Use gremlin-plan to add keyboard, focus, ARIA, and screen-reader gremlin coverage; use gremlin-report for executed accessibility findings.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-plan` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
