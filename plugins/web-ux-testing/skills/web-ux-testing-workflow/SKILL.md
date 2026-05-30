---
name: web-ux-testing-workflow
description: 'Portable web UX testing orchestrator for runtimes where the user cannot select the web-ux-testing-agent custom agent. Preserves the same gates, runner policy, and stage routing with subagent-first and skill-only fallback behavior.'
argument-hint: 'Describe app URL, stage, runner, auth strategy, workflows, risk areas, safety limits, known artifacts, and desired output.'
user-invocable: true
---

# Web UX Testing Workflow

Coordinate web UX testing when the host supports skills but may not support direct custom-agent selection.

## Runtime Modes

Use the best available mode in this order:

1. **Custom-agent mode**: call `web-ux-testing-agent` when selectable.
2. **Subagent mode**: when custom-agent selection is unavailable, route by stage to consolidated subagents.
3. **Skill-only mode**: when subagents are unavailable, run equivalent stage skills directly with the same gates and runner rules.

Do not fail only because custom-agent selection is unavailable.

## Runner Policy

- Default to `playwright-mcp` for ambiguous testing, exploration, and browser validation requests.
- Use `playwright-cli` only for explicit generated tests, existing CLI commands, CI/regression runs, conversion, or ARIA baselines.
- Use `hybrid` only for MCP discovery followed by explicit CLI regression conversion.

## Required Gates

For every new request or material scope:

1. Run requirements/scope gate logic.
2. Preserve scope summary, assumptions, out-of-scope, auth policy, runner, safety constraints, and known artifacts.
3. Before execution or conversion, run safety review logic.
4. Validate plans before execution or conversion.
5. Enforce one-scenario MCP execution or one-target CLI execution per pass (except scoped exploration mode).
6. Track and resume progress through `web-ux-test/progress.md`.

## Subagent Routing (Preferred)

| Stage | Subagent |
| --- | --- |
| Scope review, requirements collection, codebase inference, non-execution safety checks | `web-ux-requirements-agent` |
| Plan creation/review, common scenarios, ARIA plan coverage, CLI test generation | `web-ux-plan-agent` |
| MCP exploration, one-scenario MCP execution, one-target CLI execution, progress, resume, execution safety checks | `web-ux-execution-agent` |
| Findings analysis, ARIA/CLI result triage, reporting | `web-ux-results-agent` |

## Skill-Only Fallback

When subagents are unavailable, use the same fallback skills:

| Stage | Skill |
| --- | --- |
| Generate or refine plan | `generate-web-ux-test-plan` |
| Apply common scenarios | `apply-common-scenarios` |
| Review plan | `review-web-ux-test-plan` |
| Add ARIA plan or test coverage | `generate-aria-snapshot-tests` |
| Review ARIA baselines or diffs | `review-aria-snapshot-tests` |
| Execute one validated MCP scenario | `run-playwright-mcp-web-ux-test` |
| Explore with MCP | `explore-web-ux-with-playwright-mcp` |
| Run one CLI regression test | `run-playwright-cli-web-ux-test` |
| Track progress | `manage-web-ux-test-progress` |
| Summarize findings | `summarize-web-ux-findings` |
| Troubleshoot failures | `troubleshoot-web-ux-failure` |
| Convert findings or scenarios to CLI tests | `convert-web-ux-plan-to-playwright-tests` |
| Create report | `create-web-ux-report` |

Before using a referenced skill, confirm it is available. If unavailable, fail and stop.

## Stop Conditions

Stop and report blockers when:

- request is too broad, vague, conflicting, or unsafe
- required subagent or skill is unavailable for the selected mode
- auth/data/safety policy is missing for risky execution
- plan fails validation before execution/conversion
- execution would involve credentials, destructive actions, or production-risk side effects without explicit approval
- evidence is insufficient for confirmed findings

## Output

Return:

- runtime mode used
- gate decisions and preserved scope
- runner selected and why
- subagents or skills used
- files changed
- validation/execution outcomes
- findings, blockers, and missing evidence
- recommended next step
