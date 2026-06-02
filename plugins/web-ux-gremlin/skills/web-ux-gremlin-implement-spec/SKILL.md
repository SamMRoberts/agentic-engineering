---
name: web-ux-gremlin-implement-spec
description: Use after spec generation to replace placeholders, remove active requireImplementation guards, preserve ingest annotations, and pass the execution gate.
argument-hint: "Generated spec path, target-specific selectors, and expected assertions"
user-invocable: false
---

# Web UX Gremlin Implement Spec

## Scope

Use this private skill to convert the generated starter spec into an execution-ready Playwright spec.

Stop when `workflow-status --phase execute` passes.

## Required Inputs

- generated spec path
- app-specific selectors or accessible roles
- scenario assertions
- baseline assertions

If selectors or observable outcomes are unknown, stop and gather evidence before implementation.

## Procedure

1. Replace all generated `TODO:` steps with concrete Playwright actions.
2. Replace each active `requireImplementation(...)` call with real assertions.
3. Preserve the baseline and scenario annotations used by ingest.
4. Keep destructive actions disabled unless explicitly approved.
5. Run `node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase execute`.
6. If the gate fails, repair the spec and rerun the same gate.

## Validation

Run:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase execute
```

Success means the spec is safe to execute.

## Output

Report:

- implemented spec path
- selectors/assertions added
- any remaining execution blockers

## Safety Rules

- Do not leave `TODO:` placeholders behind.
- Do not leave active `requireImplementation(...)` calls inside tests.
- Do not remove baseline or scenario annotations required for ingest.
