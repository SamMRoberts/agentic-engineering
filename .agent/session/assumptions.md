# Assumption Gate

## Task
Strengthen UX Gremlin workflow sequencing.

## Scope
Only the `plugins/ux-gremlin` workflow script, docs, agent instructions, instruction fragments, and tests.

## Non-goals
- Do not change generated selector quality or implement app-specific Playwright locators.
- Do not remove the generated spec's failing-by-default behavior.
- Do not add dependencies.
- Do not change unrelated plugins or marketplace metadata.

## Assumptions
- A1: `ux-gremlin.mjs` owns the existing plugin command surface. Verified by `plugins/ux-gremlin/package.json` and the script command handlers.
- A2: generated specs are intentionally incomplete until edited. Verified by `writeGeneratedSpec` and the existing generated-spec regression test.
- A3: the gap is workflow sequencing, not basic plan validation. Verified by current skill/agent instructions and a passing baseline `npm test` run in `plugins/ux-gremlin`.

## Disproven Assumptions
None.

## Implementation Decision
Proceed. No high or critical assumption is unknown, and all medium-risk assumptions are verified with repository evidence.

## Final Verification
- `npm test` passed in `plugins/ux-gremlin`.
- `npm run validate` passed in `plugins/ux-gremlin`.
- `node plugins/assumption-killer/bin/assumption-gate.mjs check` passed.
- `node plugins/change-control-compiler/bin/change-control.mjs check` passed.
- `node plugins/change-control-compiler/bin/change-control.mjs drift` passed.

## Open Risks
None currently known.
