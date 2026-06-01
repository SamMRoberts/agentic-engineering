---
name: ux-gremlin
description: Use to turn normal web UX flows into hostile-but-realistic gremlin scenarios for Playwright, browser-agent, or manual UX resilience testing.
argument-hint: "Target URL or app area, baseline UX flow, auth requirements, safety constraints, and preferred mode"
user-invocable: true
---

# UX Gremlin

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
- `.agent/reports/ux-gremlin/report.md`

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

## Reporting Requirements

Reports must separate observed findings from suspected bugs, accessibility issues, console errors, screenshots/traces, recovery behavior, follow-up tests, and open risks.

## Anti-Patterns

- Generating gremlin scenarios without a baseline flow.
- Treating random clicking as resilience testing.
- Omitting recovery expectations.
- Claiming selectors or test data are known when they are not.
- Creating destructive tests for production or shared data.
- Using hooks as proof that the skill was selected.

## Final Response Requirements

State the plan path, generated spec path if any, report path if any, validation commands run, scenario count, safety constraints, and open risks.

## Cross-Agent Notes

Codex: use this skill before edits and run `check` before final response.

Copilot: paste `AGENTS.fragment.md` into repository instructions or adapt the example hook.

Claude: paste `custom-instructions.fragment.md` into project instructions or install this plugin where supported.

Browser agents: use the plan as the source of truth; follow the baseline first, then run gremlin mutations and record recovery behavior.

Hooks and CI validate required artifacts. They do not force skill selection.
