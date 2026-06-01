# Change Control Compiler

Before implementation, compile a Change Control Contract.

Create or update:

- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`

Define goals, non-goals, allowed changes, forbidden changes, tests, verification commands, risk, stop conditions, and acceptance checks.

Do not modify files outside allowed change areas.

Before the final response, run:

```bash
node skills/change-control-compiler/scripts/change-control.mjs check
node skills/change-control-compiler/scripts/change-control.mjs drift
```
