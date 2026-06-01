# Change Control Contract

## Task
UX Gremlin enhanced report generation.

## Problem Statement
The existing `ux-gremlin report` command only writes a static Markdown skeleton from the plan. It cannot consume execution results, preserve evidence, summarize status/severity, or produce machine-readable report data.

## Goal
Add backward-compatible enhanced UX Gremlin reports from optional structured results input with deterministic tests and documentation.

## Success Criteria
- Existing plan-only report command still succeeds.
- `report` accepts `--results` and `--out-dir`.
- `report` writes `report.md`, `report.json`, and `report.html`.
- Results template, schema, and example fixture exist.
- Reports include scenario status, findings, bugs, accessibility issues, console errors, evidence, recovery notes, commands, and risks.
- HTML is self-contained and escaped.
- Version and changelog reflect a non-breaking minor release.
- Verification commands pass.

## Scope
Bounded enhancement to the `plugins/ux-gremlin` report-generation surface.

### In Scope
- UX Gremlin CLI report behavior.
- UX Gremlin result schemas, templates, examples, and report example.
- UX Gremlin README, `SKILL.md`, version metadata, changelog, and tests.

### Out of Scope
- Playwright reporter JSON parsing.
- New runtime dependencies.
- Interactive report UI.
- Plan schema redesign.
- Unrelated plugins or generated marketplace output.

## Non-goals
- Do not infer results from Playwright output.
- Do not add JavaScript, remote assets, or external CSS to HTML reports.
- Do not modify unrelated plugin infrastructure.

## Allowed Change Areas
- `.agent`
- `plugins/ux-gremlin`

## Forbidden Change Areas
- `plugins/marketplace.json`
- Other plugin directories.
- `instructions`
- `agents`

## Files to Inspect
- `plugins/ux-gremlin/skills/ux-gremlin/scripts/ux-gremlin.mjs`
- `plugins/ux-gremlin/test/ux-gremlin.test.mjs`
- `plugins/ux-gremlin/skills/ux-gremlin/schemas/ux-gremlin-plan.schema.json`
- `plugins/ux-gremlin/skills/ux-gremlin/examples/valid-plan.yaml`
- `plugins/ux-gremlin/README.md`
- `plugins/ux-gremlin/skills/ux-gremlin/SKILL.md`
- `plugins/ux-gremlin/package.json`
- `plugins/ux-gremlin/.codex-plugin/plugin.json`
- `plugins/ux-gremlin/CHANGELOG.md`

## Files Allowed to Modify
- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`
- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`
- Files under `plugins/ux-gremlin` needed for the planned report feature.

## Files Forbidden to Modify
- `plugins/marketplace.json`

## Current Behavior
`report` reads only the plan and writes one static Markdown report to `.agent/reports/ux-gremlin/report.md`.

## Expected Behavior
`report` validates the plan, optionally reads structured YAML or JSON results, normalizes report data, and writes synchronized Markdown, JSON, and static escaped HTML artifacts to the selected report directory.

## Test Requirements
- Preserve existing tests.
- Add results-backed report output coverage.
- Verify status/severity/category rollups.
- Verify Markdown sections sourced from results.
- Verify HTML escaping.
- Verify missing or malformed results errors.
- Verify `--out-dir`.

## Verification Commands
- `npm test` from `plugins/ux-gremlin`
- `npm run validate` from `plugins/ux-gremlin`
- `node ../../scripts/sync-marketplace.mjs --check` from `plugins/ux-gremlin`
- `node plugins/assumption-killer/bin/assumption-gate.mjs check` from repo root
- `node plugins/change-control-compiler/skills/change-control-compiler/scripts/change-control.mjs drift` from repo root

## Risk Level
Medium.

## Rollback Plan
Revert changes under `plugins/ux-gremlin` and local `.agent/session` guard artifacts.

## Stop Conditions
- A new runtime dependency becomes necessary.
- Existing plan-only report compatibility cannot be preserved.
- Scope expands outside `plugins/ux-gremlin` and `.agent/session`.
- Required verification fails for a code-related reason that cannot be fixed within scope.

## Open Questions
None.

## Implementation Plan
- Extend CLI argument parsing for `--results` and `--out-dir`.
- Add result parsing, validation, normalization, rollup, Markdown, JSON, and HTML helpers.
- Add results schema, template, and example fixture.
- Update tests for legacy and enhanced reports.
- Update docs, report example, changelog, and version metadata.
- Run verification and drift checks.

## Final Acceptance Checklist
- All report artifacts are generated in default and custom output directories.
- Plan-only report remains backward compatible.
- Results-backed reports include grouped findings, suspected bugs, evidence, and recovery notes.
- HTML content is escaped and self-contained.
- Tests and validation commands pass.
- Drift check passes.
