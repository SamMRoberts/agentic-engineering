# UX Gremlin

Before creating Playwright, browser-agent, or manual UX validation tests, create `.agent/session/web-ux-gremlin-plan.yaml`.

Start with the baseline happy path. Add at least three gremlin scenarios that mutate that baseline. Include assertions, keyboard-only checks where applicable, bug indicators for high-risk cases, recovery expectations, and verification commands.

Do not create destructive tests unless explicitly marked safe with notes.

Validate before final response:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase plan
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs check
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs coverage
```

Before running Playwright, the generated spec must pass:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase execute
```

If a phase gate fails, fix the reported upstream artifact and rerun the same gate before moving on.
