# Scope Guard

Before code changes, use the Scope Guard workflow to stay disciplined.

Create or update:

- `.agent/session/scope-guard-plan.json`
- `.agent/session/scope-guard-plan.md`

Follow the lifecycle Scope -> Design -> Pseudocode -> Review -> Implement -> Update Docs. Clarify scope and ask focused scoping questions before designing, define in and out of scope, propose single-purpose components with extension points, write and review pseudocode before code, and do not implement until the pseudocode is approved. After implementation, update the design doc and diagrams and record the doc delta. Flag scope creep instead of silently expanding the task.

Before the final response, run:

```bash
node plugins/scope-guard/bin/scope-guard.mjs check
```
