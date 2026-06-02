---
name: web-ux-gremlin-plan
description: Use after discovery to create or update the Web UX Gremlin plan, complete baseline and scenario coverage, and pass the plan-phase gates.
argument-hint: "Normalized target, baseline, safety policy, workflow mode, and scenario coverage goals"
user-invocable: false
---

# Web UX Gremlin Plan

## Scope

Use this private skill to author or repair `.agent/session/web-ux-gremlin-plan.yaml` and make it safe to advance to generation.

Stop when `workflow-status --phase plan`, `check`, and `coverage` are clean enough to continue.

## Required Inputs

- normalized discovery summary
- baseline flow
- auth and safety policy
- workflow mode
- execution mode

## Procedure

1. Create or update `.agent/session/web-ux-gremlin-plan.yaml`.
2. Ensure the baseline flow is complete and ordered.
3. Add or repair gremlin scenarios that mutate the baseline.
4. Ensure every scenario has assertions and a recovery expectation.
5. Ensure high-risk and critical scenarios include bug indicators.
6. Run `node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase plan`.
7. Run `check` and `coverage`.
8. If a gate fails, repair the plan and rerun the same gate before continuing.

## Validation

Run:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase plan
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs check
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs coverage
```

Success means the plan is ready for generation.

## Output

Report:

- plan path
- workflow mode
- execution mode
- scenario count
- any remaining non-blocking warnings

## Safety Rules

- Preserve the baseline happy path as the source of truth.
- Do not silently skip missing recovery expectations or assertions.
- Do not continue past plan phase if the gate still fails.
