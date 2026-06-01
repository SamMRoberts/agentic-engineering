# Change Control Compiler

Before implementation, compile a Change Control Contract.

Required artifacts:

- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`

The contract must define goals, non-goals, allowed changes, forbidden changes, required inspection areas, required tests, verification commands, risk level, stop conditions, and final acceptance checks.

Do not modify files outside the allowed change areas.

Do not continue if the change requires forbidden files or forbidden areas.

Before final response, run:

```bash
node skills/change-control-compiler/scripts/change-control.mjs check
node skills/change-control-compiler/scripts/change-control.mjs drift
```
