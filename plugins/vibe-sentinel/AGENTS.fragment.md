# Vibe Sentinel

Before code changes, use the Vibe Sentinel guardrails.

Required artifacts:

- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`
- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`

Workflow:

1. Identify, classify, and verify assumptions with repository evidence.
2. Compile the user request into a Change Control Contract with scope, allowed/forbidden areas, verification commands, risk, and stop conditions.
3. Do not implement while any high or critical assumption is unknown.
4. Do not modify files outside the contract's allowed change areas.
5. If an assumption is disproven or scope changes, update the artifacts before continuing.

Before the final response, run:

```bash
node plugins/vibe-sentinel/bin/assumption-gate.mjs check
node plugins/vibe-sentinel/bin/change-control.mjs check
node plugins/vibe-sentinel/bin/change-control.mjs drift
```
