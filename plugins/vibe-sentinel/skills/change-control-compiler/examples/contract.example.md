# Change Control Contract

## Task

Add Change Control Compiler plugin.

## Problem Statement

Agents can drift from vague requests unless scope, forbidden areas, verification, and stop conditions are explicit before edits.

## Goal

Create a Change Control Compiler plugin that validates scope contracts and detects modified files outside allowed areas before final response.

## Success Criteria

- Valid contracts pass deterministic validation.
- Invalid contracts fail with actionable errors.
- Drift detection catches out-of-scope and forbidden file edits.

## Scope

### In Scope

- `plugins/change-control-compiler/`

### Out of Scope

- Changing unrelated plugins.
- Creating a backend service.
- Adding external dependencies.

## Non-goals

- Do not create a desktop app.
- Do not introduce runtime dependencies.
- Do not modify unrelated plugin behavior.

## Allowed Change Areas

- `plugins/change-control-compiler/`
- `plugins/marketplace.json`
- `README.md`

## Forbidden Change Areas

- `plugins/agent-compat/`
- `plugins/assumption-killer/`
- `.github/workflows/`

## Files to Inspect

- `plugins/AGENTS.md`
- `scripts/sync-marketplace.mjs`

## Files Allowed to Modify

- `plugins/change-control-compiler/plugin.json`
- `plugins/change-control-compiler/package.json`

## Files Forbidden to Modify

- `plugins/agent-compat/plugin.json`

## Current Behavior

No Change Control Compiler plugin exists in the repository.

## Expected Behavior

The plugin blocks implementation until a valid contract exists and flags modified files outside allowed scope.

## Test Requirements

- Validator accepts the valid contract.
- Validator rejects the invalid contract.
- Drift passes in a clean git repository.

## Verification Commands

- `node bin/change-control.mjs check --contract skills/change-control-compiler/examples/valid-contract.json`
- `npm test`

## Risk Level

medium

## Rollback Plan

Remove `plugins/change-control-compiler/` and regenerate `plugins/marketplace.json`.

## Stop Conditions

- Stop if implementation requires external dependencies.
- Stop if plugin metadata requires unsupported manifest fields.

## Open Questions

None.

## Implementation Plan

- Create plugin structure.
- Add validator and examples.
- Add tests.
- Regenerate marketplace.

## Final Acceptance Checklist

- Valid example passes.
- Invalid example fails.
- Drift tests pass.
