# Change Control Contract

## Task
Strengthen UX Gremlin workflow sequencing.

## Problem Statement
UX Gremlin can currently proceed toward Playwright execution before `.agent/generated/ux-gremlin.spec.ts` has implemented steps, which makes the tests non-executable in practice.

## Goal
Add a `workflow-status` command and workflow documentation that block phase advancement until required upstream UX Gremlin artifacts are complete.

## Success Criteria
- `workflow-status` accepts `--phase plan`, `generate`, `execute`, `ingest`, and `report`.
- Failed phase gates emit `ERROR:` lines and actionable next steps.
- Execute readiness fails for missing generated specs, generated `TODO:` placeholders, active `requireImplementation(...)` calls, or missing baseline/scenario annotations.
- Existing commands remain backward compatible.
- Docs and agent instructions require the ordered gate-and-repair loop.
- Regression tests cover missing spec, incomplete spec, ready spec, and plan/generation gate behavior.
- `npm test` passes in `plugins/ux-gremlin`.

## Scope
Bounded enhancement of the UX Gremlin plugin workflow gate and instructions.

## In Scope
- `plugins/ux-gremlin/skills/ux-gremlin/scripts/ux-gremlin.mjs`
- `plugins/ux-gremlin/test/ux-gremlin.test.mjs`
- UX Gremlin skill, agent, README, and instruction fragments
- Local `.agent/session` guardrail artifacts

## Out of Scope
- App-specific generated selector implementations.
- Unrelated plugin behavior.
- New dependencies.
- Marketplace metadata.
- Plugin install or load behavior.

## Allowed Change Areas
- `.agent/session`
- `plugins/ux-gremlin`

## Forbidden Change Areas
- Other plugin directories.
- `plugins/marketplace.json`
- `instructions`
- top-level `agents`

## Current Behavior
The plugin validates plans and generates failing-by-default specs, but the workflow does not provide a deterministic phase-readiness gate for spec implementation before Playwright execution.

## Expected Behavior
Agents use `workflow-status` before each phase, repair any reported incomplete upstream artifact, rerun the same gate, and only execute Playwright after the generated spec has concrete implementation and required ingest annotations.

## Verification Commands
- `npm test` from `plugins/ux-gremlin`
- `node plugins/assumption-killer/bin/assumption-gate.mjs check`
- `node plugins/change-control-compiler/bin/change-control.mjs check`
- `node plugins/change-control-compiler/bin/change-control.mjs drift`

## Risk Level
Medium.

## Rollback Plan
Revert modifications under `plugins/ux-gremlin` and restore the `.agent/session` gate artifacts.

## Stop Conditions
- The new command requires external dependencies.
- The execute gate cannot distinguish generated placeholders from implemented specs with acceptable false-positive risk.
- Existing tests fail due to unrelated behavior outside the allowed scope.
- Implementation requires changing unrelated plugin infrastructure.

## Implementation Plan
- Add `workflow-status` argument parsing and usage text.
- Implement phase gate helpers for `plan`, `generate`, `execute`, `ingest`, and `report`.
- Add execute spec inspection for missing file, placeholders, active guards, baseline annotation, and scenario annotation.
- Update UX Gremlin workflow docs and instructions with the gate-and-repair sequence.
- Add `node:test` regression coverage.
- Run validation and guardrail checks.

## Final Acceptance Checklist
- `workflow-status` command is documented.
- Execute phase is blocked for missing or incomplete generated specs.
- Ready implemented spec fixture passes execute phase.
- Docs instruct agents to repair failed gates before advancing.
- No dependencies added.
- Required verification commands pass or failures are reported.
