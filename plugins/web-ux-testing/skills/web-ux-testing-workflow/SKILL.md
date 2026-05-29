---
name: web-ux-testing-workflow
description: 'Portable web UX testing orchestrator for runtimes where the user cannot select the web-ux-testing-agent custom agent. Use for end-to-end web UX testing workflows, requirements gating, plan generation/review, MCP execution, CLI regression runs, findings analysis, reports, and conversion. Calls web-ux subagents when available; otherwise routes through the equivalent stage skills.'
argument-hint: 'Describe the app URL, stage, runner, auth strategy, workflows, risk areas, safety limits, current artifacts, and desired output.'
user-invocable: true
---

# Web UX Testing Workflow

Coordinate the web UX testing workflow when the host cannot invoke `web-ux-testing-agent` directly. This skill is the portable entrypoint for Codex-style agents and other runtimes that support skills but do not let the user select custom agents.

## Operating Mode

Before doing any stage work:
1. Build a short delegation plan for the requested stage.
2. Run the requirements gatekeeper logic before planning, execution, conversion, analysis, or reporting.
3. Default unspecified testing, exploration, browser validation, and plan generation to Playwright MCP.
4. Prefer subagent delegation when matching `web-ux-*` subagents are available; otherwise execute the equivalent stage skill directly.

For complex workflows:
- Preserve scope, assumptions, out-of-scope items, auth policy, runner choice, and safety limits across every handoff.
- Run one scenario per executor subagent or direct execution pass.
- Stop on blockers, missing safety details, or required user confirmations instead of continuing to later stages.

For simple single-stage requests:
- Avoid broad discovery.
- Route directly to the owning subagent or skill.
- Minimize token usage while preserving required context.

## Runtime Modes

Use the best available mode in this order:

1. **Custom-agent mode**: If `web-ux-testing-agent` can be selected or called, delegate the full workflow to it.
2. **Subagent mode**: If subagents can be called but the user cannot select a custom agent, call the matching private `web-ux-*` subagent for each stage.
3. **Skill-only mode**: If subagents are unavailable, execute the matching stage skill directly and preserve the same gates, runner defaults, and stop conditions.

Do not fail merely because custom-agent selection is unavailable. Fail only when the required subagent or stage skill for the selected runtime mode is unavailable, unsafe, or not found.

## Runner Selection

- Default to `playwright-mcp` when the user does not specify a runner.
- Use `playwright-mcp` for exploratory UX testing, scoped browser discovery, validated browser scenario execution, evidence capture, and ambiguous requests like "test this" or "check the UX".
- Use `playwright-cli` only when the user explicitly asks to run generated Playwright tests, execute an existing test command, run CI-style regression tests, convert scenarios or findings into durable tests, or work with ARIA snapshot baselines.
- Use `hybrid` only when the workflow intentionally starts with MCP discovery and then converts selected stable findings or scenarios into CLI regression tests.
- Use `agent-built-in-browser` only when the user or selected profile explicitly requests it instead of Playwright MCP.

## Required Gates

Run these gates for every new request or material scope:

1. **Requirements gatekeeper**: Check whether the request is too broad, vague, conflicting, unsafe, or likely to cause downstream drift.
   - If subagents are available, call `web-ux-requirements-gatekeeper`.
   - If subagents are unavailable, perform the same allow / needs_clarification / block review inline.
2. **Requirements-source gate**: Ask exactly once per request or material scope:
   - Should I ask guided questions to gather requirements from you?
   - Should I infer requirements from the codebase?
3. **Safety gate**: Before execution or conversion, review production scope, destructive actions, credentials, external side effects, broad CLI commands, auth/data policy, and privacy risk.
   - If subagents are available, call `web-ux-safety-gatekeeper`.
   - If subagents are unavailable, perform the same safety review inline.

## Subagent Delegation

When subagents are available, delegate by stage:

| Stage | Subagent |
| --- | --- |
| Scope clarity gate | `web-ux-requirements-gatekeeper` |
| Guided requirements | `web-ux-user-requirements` |
| Codebase requirements | `web-ux-codebase-requirements` |
| Plan creation, review, common scenarios, ARIA plan coverage | `web-ux-plan-curator` |
| Playwright CLI specs, fixtures, ARIA baselines | `web-ux-test-file-creator` |
| Progress checkpoints and resume state | `web-ux-progress-manager` |
| One validated MCP scenario | `web-ux-playwright-mcp-executor` |
| Open-ended MCP exploration | `web-ux-playwright-mcp-explorer` |
| One generated or existing CLI test | `web-ux-playwright-cli-executor` |
| Results analysis and troubleshooting | `web-ux-results-analyst` |
| Reports | `web-ux-report-writer` |
| Safety review | `web-ux-safety-gatekeeper` |

Pass the gatekeeper `scope_summary`, `assumptions_to_preserve`, `out_of_scope`, runner choice, auth policy, safety limits, and known artifacts to every downstream subagent.

## Skill-Only Fallback

When subagents are unavailable, use these stage skills directly:

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

Before using a referenced skill, confirm it is available. If the referenced skill is unavailable or not found, fail the workflow and stop; do not continue with an unreviewed fallback.

## Workflow Order

1. Classify the request: requirements, codebase discovery, plan creation, plan review, common scenario coverage, test file creation, MCP execution, MCP exploration, CLI execution, results analysis, report creation, troubleshooting, safety review, or conversion.
2. Run the requirements gatekeeper. Stop on `block`; ask only targeted questions on `needs_clarification`; preserve scope details on `allow`.
3. Run the requirements-source gate before requirements collection or codebase inference.
4. Gather guided requirements first when both guided and codebase requirements are enabled; codebase evidence can confirm, extend, or challenge user requirements, but must not replace them silently.
5. Route to the matching subagent or skill for the selected stage.
6. Before execution or conversion, run the safety gate.
7. For plan or CLI execution, initialize or update `web-ux-test/progress.md` before the first scenario run.
8. Run each scenario in its own executor subagent call or direct single-scenario execution pass.
9. Update progress after each scenario with findings, evidence, artifacts, blockers, and next action.
10. Analyze findings before reporting when raw evidence needs triage.
11. Convert only repeatable, safe, deterministic scenarios or confirmed findings into Playwright CLI tests.

## Stop Conditions

Stop and report the blocker when any of these are true:

- the request is too broad, vague, conflicting, or unsafe to route
- a required referenced subagent or skill is unavailable for the selected runtime mode
- base URL, auth policy, destructive-action policy, or workflow scope is missing and affects safety or execution
- a plan fails validation before execution or conversion
- execution would require credentials, production data, purchases, sends, deletes, admin actions, or irreversible side effects without explicit user approval
- the requested CLI scope is broad, production-targeted, or mutating without explicit confirmation
- evidence is missing for a claimed finding

## Output

Return:

- runtime mode used: custom-agent, subagent, or skill-only
- gate decisions and preserved scope
- runner selected and why
- subagents or skills used
- files created or changed
- validation or execution commands and outcomes
- findings, blockers, missing evidence, or required confirmations
- recommended next step

If the workflow is blocked, return the smallest set of targeted questions or setup actions needed to continue.