# Changelog

## 1.3.0

- Added explicit `playwright-cli` and `playwright-mcp` execution mode inputs. They normalize to the existing `cli` and `mcp` runner paths while preserving shorthand and legacy underscore aliases.
- Updated execution-mode schemas, templates, docs, and tests so Playwright CLI and Playwright MCP modes are accepted consistently.
- Fixed web-ux-gremlin script parsing issues in usage text and YAML numeric scalar handling so the existing valid plan validates correctly.

## 1.2.0

- Added `ingest` command to convert Playwright JSON reporter output (and optional axe-core JSON) into a results file, mapping specs to scenarios by annotation and enforcing baseline-first blocking.
- `generate-playwright` now emits runnable, failing-by-default specs with scenario/risk annotations so incomplete tests cannot silently pass in CI (`UX_GREMLIN_ALLOW_TODO=true` soft-skips while iterating).
- `check` now enforces flow-type coverage rules (form, authenticated, long_running, crud, navigation) and warns on declared network/state/data conditions without covering scenarios.
- Added `coverage` command reporting missing mandatory categories and declared-but-uncovered conditions as actionable gaps.
- Reports now open with a leadership-ready executive summary (verdict, pass rate, severity-weighted risk score, highest open severity, suspected-bug/accessibility counts, run metadata) and a ranked Top Issues & Recommended Actions table.
- Markdown rollups are now formatted tables; HTML report reaches parity with summary cards, severity badges, and status/severity bars while staying self-contained, script-free, and fully escaped.
- Added CI-gradeable output: a `gate` command and `report --fail-on <severity>` exit-code gate, plus JUnit (`report.junit.xml`) and PR-comment (`report.pr.md`) exports.
- Added lightweight run history (`history.json`) and trend reporting (pass-rate and open-bug delta vs the previous run); use `--no-history` to skip.
- Extended plan schema with `flow_type` and results schema with run `build`/`commit`; updated templates, examples, and fixtures; wired the gate into the CI example.

## 1.1.0

- Added optional structured execution results for UX Gremlin reports.
- Report generation now writes synchronized Markdown, JSON, and static HTML artifacts.
- Added report rollups for scenario status, severity, category, findings, suspected bugs, accessibility issues, console errors, evidence, recovery notes, executed commands, and open risks.
- Added results schema, template, example fixture, and regression coverage for HTML escaping and custom report output directories.

## 1.0.0

- Initial UX Gremlin plugin with plan templates, schema, validator, Playwright generator, reports, examples, hook examples, and CI example.
