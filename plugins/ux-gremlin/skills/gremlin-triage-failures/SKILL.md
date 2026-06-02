---
name: gremlin-triage-failures
description: "Deprecated: consolidated into gremlin-report. Use gremlin-report to summarize failures, open risks, suspected bugs, and recommended actions."
argument-hint: "Use gremlin-report; this compatibility skill is no longer a direct workflow entrypoint"
deprecated: true
user-invocable: false
---

# Triage Failures

## Deprecated

This skill has been consolidated into `gremlin-report` because failure triage now belongs in results reporting.

## Replacement

Use gremlin-report to summarize failures, open risks, suspected bugs, and recommended actions.

## Compatibility Behavior

- Keep this file for one major-version deprecation window.
- Do not route new user requests here.
- If invoked explicitly, hand off to `gremlin-report` and preserve any user-provided context.

## Output Artifacts

No new artifact contract is owned by this deprecated skill. Use the replacement skill's artifacts and validation commands.
