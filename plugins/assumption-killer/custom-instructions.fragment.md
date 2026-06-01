# Assumption Killer

Before code changes, use the Assumption Killer workflow.

Create or update:

- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`

List assumptions, classify risk, verify with repository evidence, and record the evidence before implementation.

Do not implement while any high or critical assumption is unknown.

Before the final response, run:

```bash
node plugins/assumption-killer/bin/assumption-gate.mjs check
```
