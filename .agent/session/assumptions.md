# Assumption Gate

## Task
Link UX Gremlin evidence artifacts in reports.

## Scope
Only the `plugins/ux-gremlin` reporting, ingest, results schema, examples, docs, tests, package metadata, and local `.agent/session` guardrail artifacts.

## Non-goals
- Do not add remote artifact upload or external report hosting.
- Do not add JavaScript or remote assets to the HTML report.
- Do not change generated Playwright test semantics beyond evidence reporting support.
- Do not modify unrelated plugins or hand-edit `plugins/marketplace.json`.

## Assumptions
- A1: `ux-gremlin.mjs` owns ingest and report generation. Verified by `plugins/ux-gremlin/package.json` and the command functions in `plugins/ux-gremlin/skills/ux-gremlin/scripts/ux-gremlin.mjs`.
- A2: results can be extended compatibly. Verified by the results schema, validator, examples, and normalization code preserving `screenshots` and `traces` string arrays.
- A3: Playwright evidence can be read from per-result `attachments` entries. Verified against the existing JSON traversal shape and will be enforced with a regression test fixture.
- A4: evidence links can be rendered safely. Verified by current HTML escaping behavior and planned malicious artifact-name regression coverage.

## Disproven Assumptions
None.

## Implementation Decision
Proceed. The high-risk assumptions are verified through repository evidence plus required regression tests before production-code behavior is changed.

## Final Verification
- `npm --prefix /Users/samroberts/Repo/SamMRoberts/agentic-engineering/plugins/ux-gremlin test` passed.
- `npm --prefix /Users/samroberts/Repo/SamMRoberts/agentic-engineering/plugins/ux-gremlin run validate` passed.
- `node /Users/samroberts/Repo/SamMRoberts/agentic-engineering/scripts/sync-marketplace.mjs --check` passed.
- `node /Users/samroberts/Repo/SamMRoberts/agentic-engineering/plugins/assumption-killer/bin/assumption-gate.mjs check --root /Users/samroberts/Repo/SamMRoberts/agentic-engineering` passed.
- `node /Users/samroberts/Repo/SamMRoberts/agentic-engineering/plugins/change-control-compiler/bin/change-control.mjs check --root /Users/samroberts/Repo/SamMRoberts/agentic-engineering` passed.
- `node /Users/samroberts/Repo/SamMRoberts/agentic-engineering/plugins/change-control-compiler/bin/change-control.mjs drift --root /Users/samroberts/Repo/SamMRoberts/agentic-engineering` passed.

## Open Risks
- Real Playwright output may include attachment variants not covered by the fixture. The implementation should ignore unreadable/missing attachment paths gracefully and record an open risk instead of crashing the whole ingest.
