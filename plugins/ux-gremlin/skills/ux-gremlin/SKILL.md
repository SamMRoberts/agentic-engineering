---
name: ux-gremlin
description: Deprecated end-to-end UX Gremlin workflow. Prefer the focused skills or ux-gremlin-auto for new work.
argument-hint: "Target URL or app area, baseline UX flow, auth requirements, safety constraints, and preferred mode"
user-invocable: true
---

# UX Gremlin

> Deprecated: Prefer the focused skills in `skills/` (for example `test-strategy-advisor`, `plan-gremlins`, `validate-plan`, `generate-playwright`, and `report-gremlins`) or use `ux-gremlin-auto` for artifact-based dispatch. This monolithic skill remains for compatibility.

## Purpose

Use this skill to generate and validate UX Gremlin Plans: structured resilience test plans that mutate a normal happy-path web flow into hostile-but-realistic user behavior.

## When to Use

Use before creating or modifying Playwright, browser-agent, Playwright MCP, or manual UX validation tests for a web flow.

## When Not to Use

Do not use for API-only tests, unit tests, synthetic load tests, security exploitation, destructive production testing, or generic Playwright generation that does not start from a baseline UX flow.

## Required Inputs

- Target URL, route, or app area.
- Baseline happy-path user flow.
- Authentication requirements and permission boundaries.
- Safety policy for destructive actions and test data.
- Preferred mode: `playwright_cli`, `playwright_mcp`, `agent_browser`, or `manual_checklist`.

Ask for clarification when auth, destructive actions, production data, or mutation scope is unclear.

## Output Artifacts

- `.agent/session/ux-gremlin-plan.yaml`
- `.agent/generated/ux-gremlin.spec.ts` when Playwright generation is requested.
- `.agent/evidence/ux-gremlin/<scenario-id>/...` when executed Playwright attachments are ingested.
- `.agent/reports/ux-gremlin/report.md`
- `.agent/reports/ux-gremlin/report.json`
- `.agent/reports/ux-gremlin/report.html`
- `.agent/reports/ux-gremlin/report.junit.xml`
- `.agent/reports/ux-gremlin/report.pr.md`

## Commands

- `init`, `check`, `summary`: create and validate the plan.
- `coverage`: report missing mandatory categories for the declared `flow_type` and declared-but-uncovered conditions.
- `workflow-status --phase <plan|generate|execute|ingest|report>`: verify required upstream artifacts before moving to the next phase.
- `generate-playwright`: emit a runnable spec annotated with scenario id and risk. When `playwright_steps` is present, scenarios with at least one `expect_*` action drop the `requireImplementation` guard so the spec is execution-ready.
- `ingest --input <playwright.json> [--axe <axe.json>]`: convert executed Playwright JSON results into a results file, mapping specs to scenarios and blocking mutations when the baseline fails.
- `report [--results <file>] [--fail-on <severity>] [--no-history]`: render all report artifacts with an executive summary, risk score, Top Issues table, and trend.
- `gate --results <file> [--fail-on <severity>]`: exit non-zero when the highest open severity meets or exceeds the threshold.

Set `flow_type` in the plan (`form`, `authenticated`, `long_running`, `crud`, `read_only`, `navigation`) so `check` and `coverage` can enforce the mandatory scenario categories below.

## Required Workflow Sequence

Follow this order. Before moving to a phase, run `workflow-status --phase <phase>`. If it fails, fix the incomplete upstream artifact, rerun the same gate, and continue only after it passes.

1. Collect target, auth, safety, runner, and baseline flow.
2. Run `init` and complete `.agent/session/ux-gremlin-plan.yaml`.
3. Run `workflow-status --phase plan`, `check`, and `coverage`; fix plan gaps.
4. Run `workflow-status --phase generate`, then `generate-playwright`.
5. Implement `.agent/generated/ux-gremlin.spec.ts`: either hand-edit `TODO:` blocks and remove active `requireImplementation(...)` calls, or author a `playwright_steps` recipe for the baseline and each scenario so `generate-playwright` produces an execution-ready spec.
6. Run `workflow-status --phase execute`; do not run Playwright until this passes.
7. Run Playwright with a JSON reporter, then `workflow-status --phase ingest --input <playwright.json>` and `ingest`.
8. Run `workflow-status --phase report --results .agent/session/ux-gremlin-results.json`, then `report` or `gate`.

## Gremlin Scenario Categories

Use these categories where relevant: `double_submit`, `rapid_clicking`, `keyboard_only`, `screen_reader_semantics`, `browser_back_forward`, `reload_mid_flow`, `modal_escape`, `tab_switching`, `slow_network`, `offline_recovery`, `stale_cache`, `expired_auth`, `permission_denied`, `invalid_required_fields`, `partial_form_completion`, `duplicate_entity_creation`, `deep_link_entry`, `interrupted_save`, `concurrent_edit`, `viewport_resize`, `mobile_touch`, `session_storage_clear`, `local_storage_clear`, `cookie_clear`, `unexpected_navigation`, `long_running_operation`.

## Risk Levels

- `low`: annoyance or minor recoverable friction.
- `medium`: user confusion, lost progress risk, or repeated action risk.
- `high`: data integrity, auth, duplicate work, accessibility blocker, or likely support issue.
- `critical`: destructive outcome, data loss, privilege leak, payment, compliance, or production incident risk.

## Scenario Generation Rules

1. Always create a baseline happy-path flow first.
2. Gremlin scenarios must mutate the baseline flow, not replace it.
3. Every scenario must include an expected recovery behavior.
4. Every scenario must include at least one assertion.
5. High-risk scenarios must include bug indicators.
6. Accessibility checks must include keyboard-only behavior where applicable.
7. Form flows must include invalid, partial, duplicate, and interrupted submission scenarios.
8. Authenticated flows must include expired session or permission loss scenarios.
9. Long-running flows must include reload, timeout, and partial completion scenarios.
10. Do not create destructive tests unless explicitly marked safe.

## Accessibility Requirements

Include keyboard-only navigation, visible focus, focus return after modals, accessible names for controls, status announcements for long-running work, and screen-reader notes for dynamic content.

## Playwright Requirements

Prefer role-based locators and accessible names. Use placeholders when selectors are unknown. Use `test.step` blocks. Include comments for assertions, recovery checks, screenshots, traces, and accessibility checks. Do not execute destructive paths unless `safety.destructive_actions_allowed` is true and safety notes are present.

Generated specs are not execution-ready until their placeholders are implemented. `UX_GREMLIN_ALLOW_TODO=true` may soft-skip unfinished generated tests during local iteration, but `workflow-status --phase execute` still treats TODOs and active `requireImplementation(...)` guards as incomplete.

## Reporting Requirements

Reports must separate observed findings from suspected bugs, accessibility issues, console errors, screenshots/traces, recovery behavior, follow-up tests, and open risks. Every report opens with an executive summary (verdict, pass rate, severity-weighted risk score, highest open severity, suspected-bug and accessibility counts, run metadata) and a ranked Top Issues & Recommended Actions table for leadership and product reviewers.

Use plan-only report generation when execution has not happened yet. After execution, pass a structured results YAML or JSON file with `--results`, or produce one with `ingest`. Results must record scenario status (`passed`, `failed`, `blocked`, `not_run`, or `needs_review`), severity, outcome, evidence, commands, recovery notes, and risks where known. Ingested Playwright attachments are copied to `.agent/evidence/ux-gremlin/<scenario-id>/` and linked from Markdown/HTML reports when local paths are available. Static HTML reports must remain self-contained, escaped, and script-free. Use `gate` or `report --fail-on <severity>` in CI to block merges on suspected regressions.

## Anti-Patterns

- Generating gremlin scenarios without a baseline flow.
- Treating random clicking as resilience testing.
- Omitting recovery expectations.
- Claiming selectors or test data are known when they are not.
- Creating destructive tests for production or shared data.
- Using hooks as proof that the skill was selected.

## Final Response Requirements

State the plan path, generated spec path if any, report paths if any, validation commands run, scenario count, safety constraints, and open risks.

## Cross-Agent Notes

Codex: use this skill before edits and run `check` before final response.

Copilot: paste `AGENTS.fragment.md` into repository instructions or adapt the example hook.

Claude: paste `custom-instructions.fragment.md` into project instructions or install this plugin where supported.

Browser agents: use the plan as the source of truth; follow the baseline first, then run gremlin mutations and record recovery behavior.

Hooks and CI validate required artifacts. They do not force skill selection.
