---
name: web-ux-gremlin-generate
description: Use after plan validation to advance the generate gate and create the starter Web UX Gremlin Playwright spec.
argument-hint: "Plan path and desired workflow/execution mode"
user-invocable: false
---

# Web UX Gremlin Generate

## Scope

Use this private skill to advance from a validated plan to `.agent/generated/web-ux-gremlin.spec.ts`.

Stop when the generated spec exists and generation-phase validation passes.

## Required Inputs

- validated plan
- workflow mode
- execution mode

## Procedure

1. Run `node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase generate`.
2. Run `generate-playwright`.
3. Confirm `.agent/generated/web-ux-gremlin.spec.ts` exists.
4. Hand off to spec implementation; do not run Playwright yet.

## Validation

Run:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase generate
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs generate-playwright
```

## Output

Report:

- generated spec path
- whether auto scenarios were added
- explicit reminder that placeholders must be implemented before execution

## Safety Rules

- Do not treat generation as execution readiness.
- Do not bypass the execution gate after generation.
