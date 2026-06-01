# Change Control Contract

## Task
Link UX Gremlin evidence artifacts in reports.

## Problem Statement
UX Gremlin reports currently list screenshot and trace paths as plain text, ingest does not preserve Playwright attachments in `.agent/evidence`, and the HTML report lacks dense evidence-oriented navigation for review.

## Goal
Copy local Playwright attachments into `.agent/evidence/ux-gremlin` during ingest and render safe evidence links plus a denser static HTML review layout in generated UX Gremlin reports.

## Success Criteria
- `ingest` copies readable Playwright attachment files into `.agent/evidence/ux-gremlin/<scenario-id>/`.
- Ingested results preserve `screenshots` and `traces` and record generic attachments in `evidence_artifacts`.
- `report.md` links local `.agent/evidence` artifacts from scenario and global evidence sections.
- `report.html` links local `.agent/evidence` artifacts with escaped labels and encoded hrefs while remaining script-free and self-contained.
- `report.json` exposes normalized evidence metadata without removing existing `screenshots` or `traces` arrays.
- The HTML report includes data-rich navigation such as a scenario index, anchors, evidence counts, and grouped evidence links.
- Docs, examples, schema, package metadata, and changelog describe the new evidence behavior.
- `npm test`, `npm run validate`, guardrail checks, and marketplace sync check pass.

## Scope
Bounded enhancement of UX Gremlin evidence ingestion and generated report readability.

## In Scope
- `plugins/ux-gremlin/skills/ux-gremlin/scripts/ux-gremlin.mjs`
- `plugins/ux-gremlin/test/ux-gremlin.test.mjs`
- UX Gremlin results schema, template, and examples
- UX Gremlin README, skill instructions, changelog, and plugin version metadata
- Local `.agent/session` guardrail artifacts

## Out of Scope
- Remote artifact upload or hosting.
- Interactive JavaScript filtering, sorting, or search in the HTML report.
- New npm dependencies.
- App-specific Playwright test implementation changes.
- Unrelated plugin or top-level instruction changes.

## Allowed Change Areas
- `.agent/session`
- `plugins/ux-gremlin`

## Forbidden Change Areas
- Other plugin directories.
- `plugins/marketplace.json`
- `instructions`
- top-level `agents`

## Current Behavior
Ingest emits empty `screenshots` and `traces` arrays, does not copy Playwright attachments, Markdown and HTML reports render evidence paths as plain text, and HTML scenario detail lacks evidence-focused navigation and counts.

## Expected Behavior
After Playwright JSON ingest, related local attachment files are copied into `.agent/evidence/ux-gremlin` and all generated reports expose safe links and data-dense evidence review affordances without breaking existing results consumers.

## Verification Commands
- `cd plugins/ux-gremlin && npm test`
- `cd plugins/ux-gremlin && npm run validate`
- `node plugins/assumption-killer/bin/assumption-gate.mjs check`
- `node plugins/change-control-compiler/bin/change-control.mjs check`
- `node plugins/change-control-compiler/bin/change-control.mjs drift`
- `node scripts/sync-marketplace.mjs --check`

## Risk Level
Medium.

## Rollback Plan
Revert the listed UX Gremlin files and local `.agent/session` guardrail artifacts; no external state or dependencies are changed.

## Stop Conditions
- Implementation requires a new dependency.
- Evidence copying would write outside `.agent/evidence/ux-gremlin` by default.
- Safe link rendering cannot preserve HTML escaping guarantees.
- Schema changes would require breaking existing `screenshots` or `traces` consumers.
- Validation failures point to unrelated files outside the allowed scope.

## Implementation Plan
- Add tests first for attachment copying, evidence classification, report links, HTML escaping, and readability markers.
- Extend results validation and schema with optional `evidence_artifacts` arrays.
- Add evidence path, attachment copying, filename sanitization, and relative-link helpers to `ux-gremlin.mjs`.
- Update `commandIngest` to copy and classify Playwright attachments while preserving missing-attachment open risks.
- Update `normalizeReport` with evidence metadata and update Markdown/HTML renderers to link local evidence artifacts safely.
- Enhance static HTML with scenario index, anchors, evidence counts, grouped evidence links, responsive tables, and focus/readability CSS.
- Update examples, templates, docs, skill instructions, changelog, and plugin version metadata.
- Run required validation and update final guardrail verification.

## Final Acceptance Checklist
- Copied evidence files land under `.agent/evidence/ux-gremlin/<scenario-id>/`.
- Existing `screenshots` and `traces` arrays remain available in results and report JSON.
- Markdown and HTML reports link evidence artifacts stored in `.agent/evidence`.
- HTML report remains static, escaped, responsive, and script-free.
- Docs and examples describe the evidence directory and report links.
- Plugin version and changelog reflect the user-facing feature.
- All required verification commands pass or any blocker is reported.
