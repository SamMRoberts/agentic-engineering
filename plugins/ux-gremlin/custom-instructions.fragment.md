# UX Gremlin

Before creating Playwright, browser-agent, or manual UX validation tests, create `.agent/session/ux-gremlin-plan.yaml`.

Start with the baseline happy path. Add at least three gremlin scenarios that mutate that baseline. Include assertions, keyboard-only checks where applicable, bug indicators for high-risk cases, recovery expectations, and verification commands.

Do not create destructive tests unless explicitly marked safe with notes.

Validate before final response:

```bash
node skills/ux-gremlin/scripts/ux-gremlin.mjs check
```
