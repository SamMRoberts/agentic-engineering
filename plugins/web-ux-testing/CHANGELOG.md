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
- Added Playwright CLI execution and report-generation skills with eval coverage.
- Added a findings collection schema and reusable web UX report template.
