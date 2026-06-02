# Scope Guard

Before code changes, use the Scope Guard workflow to stay disciplined.

Required artifacts:

- `.agent/session/scope-guard-plan.json`
- `.agent/session/scope-guard-plan.md`

Lifecycle: **Scope -> Design -> Pseudocode -> Review -> Implement -> Update Docs.**

Workflow:

1. Clarify the goal and ask focused scoping questions when requirements are ambiguous.
2. Define `inScope` and `outOfScope` before designing.
3. Propose single-purpose components with explicit extension points.
4. Write pseudocode before code, then review it for correctness, scope creep, and design quality.
5. Do not implement until the pseudocode is approved (unless the user asks for a fast best-effort pass).
6. After implementation, update the design doc and diagrams and record the doc delta.
7. Treat unrelated additions as future work and flag scope creep instead of absorbing it.

Before the final response, run:

```bash
node plugins/scope-guard/bin/scope-guard.mjs check
```
