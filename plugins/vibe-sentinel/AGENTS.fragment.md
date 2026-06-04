# Vibe Sentinel

Before code changes, use the Vibe Sentinel guardrails.

Required artifacts:

- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`
- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`
- `.agent/session/scope-guard-plan.json`
- `.agent/session/scope-guard-plan.md`

Workflow:

1. Identify, classify, and verify assumptions with repository evidence.
2. Compile the user request into a Change Control Contract with scope, allowed/forbidden areas, verification commands, risk, and stop conditions.
3. For medium/high/critical implementation tasks, architecture changes, parser changes, CI changes, dependency changes, API changes, and multi-file behavior changes, fill and approve the Scope Guard plan before implementation.
4. Do not implement while any high or critical assumption is unknown.
5. Do not modify files outside the contract's allowed change areas or outside the approved Scope Guard plan when it is required.
6. If an assumption is disproven or scope changes, update the artifacts before continuing.

Scope Guard is not required for read-only explanations or trivial documentation typo fixes unless the user explicitly asks for the full lifecycle.

Before the final response, run:

```bash
node plugins/vibe-sentinel/scripts/assumption-gate.mjs check
node plugins/vibe-sentinel/scripts/change-control.mjs check
node plugins/vibe-sentinel/scripts/change-control.mjs drift
node plugins/vibe-sentinel/scripts/scope-guard.mjs check # when Scope Guard was required
```
