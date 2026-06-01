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

Hooks and CI can enforce the artifact and validation result. They do not force skill selection.
