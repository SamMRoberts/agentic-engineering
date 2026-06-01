# Vibe Sentinel

Before code changes, use the Vibe Sentinel guardrails.

Create or update:

- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`
- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`

Verify assumptions with repository evidence, compile a scope contract with allowed and forbidden areas, and stay inside that scope. Do not implement while any high or critical assumption is unknown.

Before the final response, run:

```bash
node plugins/vibe-sentinel/bin/assumption-gate.mjs check
node plugins/vibe-sentinel/bin/change-control.mjs check
node plugins/vibe-sentinel/bin/change-control.mjs drift
```
