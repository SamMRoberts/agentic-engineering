---
name: run-workflow-step
description: "Use when advancing the web-ux-test workflow by exactly one phase. Use for delegating to the CLI's `run next` or `run phase <phase>` commands without bypassing gates."
argument-hint: "<optional target phase>"
user-invocable: false
---

# Run workflow step

## Scope

Advance the workflow by exactly one phase. `run next` advances the engine-suggested next event when no payload is required; for payload-bearing events (e.g., `test_executed`), use the matching dedicated CLI command.

## Procedure

```bash
web-ux-test run next
# or
web-ux-test run phase <phase>
```

`<phase>` can be any value from `schemas/workflow-state.schema.yaml#properties.phase`. The CLI rejects transitions that the engine considers illegal from the current phase.

## Output

- `state.json` updated; `history` gains a new entry.
- stdout prints `{ ok, fromPhase, toPhase, event }`.

## Validation

```bash
web-ux-test state validate
```

## Safety

- Never edit `state.json` directly.
- Never run multiple `run next` invocations in a single response without acknowledging the new phase. The CLI is single-step on purpose.
