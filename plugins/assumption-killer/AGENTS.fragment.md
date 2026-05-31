# Assumption Killer

Before code changes, use the Assumption Killer workflow.

Required artifacts:

- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`

Before modifying production code, tests, config, parser logic, Playwright flows, build scripts, CI, release logic, or architecture:

1. Identify assumptions.
2. Classify assumption risk.
3. Verify assumptions using repository evidence.
4. Record evidence in the required artifacts.

Do not implement while any high or critical assumption is unknown.

If an assumption is disproven, update the plan before implementation.

Before final response, run:

```bash
node plugins/assumption-killer/bin/assumption-gate.mjs check
```
