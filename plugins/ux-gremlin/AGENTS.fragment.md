# UX Gremlin Workflow

Before creating or modifying Playwright, browser-agent, or manual UX validation tests, use the UX Gremlin workflow.

Required artifact:

- `.agent/session/ux-gremlin-plan.yaml`

Every UX flow must include:

- baseline happy path
- at least three gremlin scenarios
- keyboard-only check where applicable
- recovery expectations
- verification command

Use gremlin scenarios to mutate the baseline flow through realistic user behavior, timing, browser navigation, accessibility paths, auth state, reloads, stale state, and interrupted flows.

Do not create destructive tests unless the plan explicitly marks them safe and explains the safety boundary.

Before final response, run:

```bash
node skills/ux-gremlin/scripts/ux-gremlin.mjs check
```

Required phase sequence:

1. Complete `.agent/session/ux-gremlin-plan.yaml`.
2. Run `workflow-status --phase plan`, `check`, and `coverage`; fix gaps before continuing.
3. Run `workflow-status --phase generate`, then `generate-playwright`.
4. Implement `.agent/generated/ux-gremlin.spec.ts` by replacing generated `TODO:` blocks and removing active `requireImplementation(...)` calls.
5. Run `workflow-status --phase execute`; do not run Playwright until it passes.
6. Run Playwright with a JSON reporter, then `workflow-status --phase ingest --input <playwright-json>` and `ingest`.
7. Run `workflow-status --phase report --results .agent/session/ux-gremlin-results.json`, then `report` or `gate`.

If a phase gate fails, repair the reported upstream artifact and rerun the same gate before moving to the next step.

Hooks and CI can enforce the artifact and validation result. They do not force skill selection.
