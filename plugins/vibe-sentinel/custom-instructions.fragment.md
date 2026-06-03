# Vibe Sentinel

Before code changes, use the Vibe Sentinel guardrails.

Create or update:

- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`
- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`
- `.agent/session/scope-guard-plan.json`
- `.agent/session/scope-guard-plan.md`

Verify assumptions with repository evidence, compile a scope contract with allowed and forbidden areas, and stay inside that scope. For medium/high/critical implementation tasks, architecture changes, parser changes, CI changes, dependency changes, API changes, and multi-file behavior changes, fill and approve the Scope Guard plan before implementation. Do not implement while any high or critical assumption is unknown.

Scope Guard is not required for read-only explanations or trivial documentation typo fixes unless the user explicitly asks for the full lifecycle.

Before the final response, run:

```bash
node scripts/assumption-gate.mjs check
node scripts/change-control.mjs check
node scripts/change-control.mjs drift
node scripts/scope-guard.mjs check # when Scope Guard was required
```
