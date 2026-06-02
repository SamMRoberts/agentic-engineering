# Changelog

## 3.0.0

- Removed deprecated compatibility skill directories for advisory and analysis entrypoints that were consolidated in 2.1.0.
- BREAKING CHANGE: `gremlin-test-strategy-advisor`, `gremlin-baseline-recorder`, `gremlin-selector-discovery`, `gremlin-triage-failures`, `gremlin-fix-suggestions`, `gremlin-regression-guard`, `gremlin-accessibility-audit`, `gremlin-plan-from-pr`, `gremlin-ci-integration`, `gremlin-convert-existing`, and `gremlin-explain-scenario` are no longer plugin skill entrypoints.
- Use `gremlin-plan`, `gremlin-generate-playwright`, and `gremlin-report` for the removed responsibilities.

## 2.1.0

- Consolidated the active UX Gremlin skill surface to `gremlin-auto`, `gremlin-plan`, `gremlin-validate-plan`, `gremlin-generate-playwright`, `gremlin-execute-tests`, and `gremlin-report`.
- Deprecated thin advisory and analysis skills while preserving their directories for compatibility; deprecated script wrappers now hand off to the replacement active skill instead of printing TODO stubs.
- Updated the orchestrator, README, Codex/Claude instruction fragments, and plugin metadata to route strategy, baseline capture, selector guidance, triage, fix recommendations, regression summaries, CI gates, PR planning, accessibility planning, existing-test conversion, and scenario explanation through the consolidated active skills.

## 1.4.0

- Added a `playwright_steps` recipe DSL to `baseline_flow` and `gremlin_scenarios`. `generate-playwright` compiles recipe steps (`goto`, `click`, `fill`, `press`, `wait_for_url`, `expect_visible`, `expect_text`, `expect_count`, `screenshot`) into runnable Playwright code using `getByRole`/`getByLabel`/`getByTestId` locators.
- When a recipe includes at least one `expect_*` assertion, the generated test omits the `requireImplementation` guard and TODO markers so `workflow-status --phase execute` can pass without manual edits.
- Plans without `playwright_steps` keep the existing failing-by-default behavior.
- Recipe screenshots are emitted via `testInfo.attach(...)` so `ingest` copies them into `.agent/evidence/ux-gremlin/<scenario-id>/` through the existing Playwright attachment flow.
- `validatePlan` rejects unknown actions, missing selectors, missing `value`/`text`/`key`/`url`, and non-integer `count` with actionable error messages.
- Plan schema, README, and SKILL.md document the recipe DSL and the supported action vocabulary.

## 1.3.0

- `ingest` now copies Playwright attachment files into `.agent/evidence/ux-gremlin/<scenario-id>/`, classifies screenshots/traces/generic artifacts, and records missing evidence as open risks instead of failing the whole run.
- Reports now render related `.agent/evidence` artifacts as safe relative links in Markdown and static HTML while preserving escaped, script-free output.
- `report.json` now includes normalized per-scenario evidence metadata alongside the existing `screenshots` and `traces` arrays; results may also include `evidence_artifacts` and `evidence_items`.
- HTML reports now include an executive decision header, section navigation, metric grid, scenario index, scenario anchors, evidence counts, grouped evidence library, responsive table wrapping, focus styles, and print-friendly static CSS for data-rich review.

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
