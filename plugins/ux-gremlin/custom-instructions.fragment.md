# UX Gremlin

Before creating Playwright, browser-agent, or manual UX validation tests, create `.agent/session/ux-gremlin-plan.yaml`.

Start with the baseline happy path. Add at least three gremlin scenarios that mutate that baseline. Include assertions, keyboard-only checks where applicable, bug indicators for high-risk cases, recovery expectations, and verification commands.

Do not create destructive tests unless explicitly marked safe with notes.

Validate before final response:

```bash
node skills/ux-gremlin/scripts/ux-gremlin.mjs check
```

Use the required phase gates in order:

1. `workflow-status --phase plan`
2. `workflow-status --phase generate`
3. `generate-playwright`
4. implement `.agent/generated/ux-gremlin.spec.ts` by replacing generated `TODO:` blocks and removing active `requireImplementation(...)` calls
5. `workflow-status --phase execute`
6. run Playwright with a JSON reporter
7. `workflow-status --phase ingest --input <playwright-json>`, then `ingest`
8. `workflow-status --phase report --results .agent/session/ux-gremlin-results.json`, then `report` or `gate`

If a gate fails, fix the incomplete upstream artifact, rerun the same gate, and continue only after it passes.
