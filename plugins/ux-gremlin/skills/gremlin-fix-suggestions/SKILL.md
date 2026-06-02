---
name: gremlin-fix-suggestions
description: "Deprecated: consolidated into gremlin-report. Use gremlin-report to produce the Top Issues and Recommended Actions output from ingested results."
argument-hint: "Use gremlin-report; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Fix Suggestions

## Deprecated

This skill has been consolidated into `gremlin-report` because fix recommendations now belong in results reporting.

## Replacement

Use gremlin-report to produce the Top Issues and Recommended Actions output from ingested results.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-report` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
