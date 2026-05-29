# Changelog

## 0.1.0

- Initial web UX testing Copilot skill pack.
- Added custom agent profile.
- Added skills for generation, review, common scenarios, troubleshooting, and Playwright conversion.
- Added schemas for plans, configs, scenarios, and findings.
- Added scenario library and registry.
- Added profiles, templates, checklists, and utility scripts.

## 0.2.0

- Added ARIA snapshot testing integration.
- Added ARIA scenario modules for page, component, form, dialog, and live-region checks.
- Added ARIA snapshot schema, checklist, profile, templates, and scripts.
- Updated plan/scenario/finding schemas to support `aria_snapshot` evidence and ARIA metadata.

## Unreleased

- Added skill-first coverage for Playwright MCP execution, findings summaries, and ARIA snapshot reviews.
- Updated the custom agent and README for agent-first usage without requiring prompt invocation.
- Removed secondary wrappers from the public plugin export.
- Added private role-specific sub-agents for user requirements, codebase requirements, plan curation, test file creation, MCP execution, CLI execution, result analysis, report writing, and safety review.
- Reworked `web-ux-testing-agent` into a thin user-facing orchestrator with narrow tools and explicit sub-agent delegation.
- Added a one-time requirements-source gate so the orchestrator asks whether to gather guided user requirements and whether to infer codebase requirements before invoking requirements sub-agents.
- Preserved guided user requirements as the baseline when codebase inference is also enabled.
- Split Playwright MCP execution into separate private agents and skills for validated plan/scenario execution and exploratory discovery.
- Added `web-ux-test/progress.md` checkpoint guidance so each test scenario runs in its own executor sub-agent session and interrupted runs can resume from recorded progress.
- Added Playwright CLI execution and report-generation skills with eval coverage.
- Added a findings collection schema and reusable web UX report template.

### Performance refactor (workflow speed)

- Flattened the architecture for speed: `web-ux-testing-agent` is now a single fast
  primary agent (Claude Sonnet 4.6) that runs requirements, plan creation/review,
  scenario application, progress tracking, results analysis, reporting, test
  generation, and safety review inline via skills instead of delegating each to a
  separate sub-agent.
- Removed the read-only role sub-agents (`web-ux-user-requirements`,
  `web-ux-codebase-requirements`, `web-ux-plan-curator`, `web-ux-test-file-creator`,
  `web-ux-progress-manager`, `web-ux-results-analyst`, `web-ux-report-writer`,
  `web-ux-safety-gatekeeper`); their skills are now run by the primary agent.
- Kept only isolated least-privilege executor sub-agents for browser MCP exploration,
  validated plan execution, and Playwright CLI runs, preserving safety tool-scope
  boundaries.
- Replaced per-scenario sub-agent fan-out with a batch executor contract: one executor
  session runs the full scenario list, marks each `in_progress`, appends findings to
  `results.yaml`, and checkpoints `progress.md` per scenario (resume capability
  preserved).
- Replaced the safety-gatekeeper agent with an inline safety checklist plus
  `validate-plan.mjs` enforcement.
- Added tiered modes (quick-scan default, planned-run, regression-generation,
  full-audit) so the common case is fast.
- Replaced the two-question requirements-source gate with a single fast path that asks
  only blocking questions.
- Moved hot-path roles off Claude Opus 4.8 to faster models.
- Removed the unreferenced `prompts/` wrappers that duplicated skill content.
