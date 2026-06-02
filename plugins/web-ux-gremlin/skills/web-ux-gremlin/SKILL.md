---
name: web-ux-gremlin
description: Use to orchestrate Web UX Gremlin workflows across discovery, planning, spec generation, spec implementation, execution, ingest, and reporting while keeping phase-gate enforcement in the script.
argument-hint: "Target URL or app area, baseline UX flow, auth requirements, risk policy, workflow mode, and execution mode"
user-invocable: true
---

# Web UX Gremlin

Use this skill as the public entry point for UX resilience planning and execution.

## When to use

Use it for web UX coverage that should go beyond the happy path, including timing, ordering, navigation, auth, stale data, and accessibility behavior.

Avoid using it for:

- API-only tests
- Unit tests
- Destructive production testing
- Generic non-UX automation

## Inputs

Required:

- Target URL or app area
- Baseline happy-path flow
- Workflow mode (`manual`, `guided`, `auto`)
- Execution mode (`playwright-cli` default, or `playwright-mcp`; aliases `cli` and `mcp` are accepted)
- Safety boundaries (`destructive_actions_allowed`, notes, cleanup expectations)

`manual`
: keep all workflow details in the plan template.

`guided`
: prompts for focus targets, objectives, risk tolerance, and mutation depth.

`auto`
: auto-adds uncommon-path gremlin scenarios from the script while preserving user-defined ones.

`playwright-cli`
: execute generated Playwright specs via Playwright CLI (`npx playwright test`).

`playwright-mcp`
: execute using Playwright MCP (`playwright-mcp`) for longer, persistent browser-agent-like runs.

## Plan and workflow contract

Plan file defaults to `.agent/session/web-ux-gremlin-plan.yaml` and must include:

- `target`
- `mode`
- `workflow` (mode + optional targets/objectives)
- `safety`
- `baseline_flow`
- `gremlin_scenarios`
- `accessibility_checks`
- `assertions`
- `bug_indicators`
- `recovery_expectations`
- `verification_commands`
- `reporting`

## Commands

- `init` -> scaffold plan and report directory
- `check` -> validate plan + coverage
- `coverage` -> print category coverage and warning list
- `summary` -> print concise plan summary
- `generate` / `generate-playwright` -> write `.agent/generated/web-ux-gremlin.spec.ts`
- `workflow-status --phase <plan|generate|execute|ingest|report>` -> validate that the next phase is safe before moving on
- `run` -> execute spec (supports `--mode playwright-cli|playwright-mcp|cli|mcp`, supports `--mcp-state`, `--mcp-command`)
- `ingest` -> convert Playwright JSON report to normalized scenario results
- `report` -> produce `report.md`, `report.json`, `report.html`, `report.junit.xml`, `report.pr.md`
- `gate` -> fail when highest open severity meets threshold

## Private stage skills

The plugin now separates stage-specific work into non-user-invocable skills:

- `web-ux-gremlin-discovery`
- `web-ux-gremlin-plan`
- `web-ux-gremlin-generate`
- `web-ux-gremlin-implement-spec`
- `web-ux-gremlin-execute`
- `web-ux-gremlin-ingest-report`

Use `web-ux-gremlin` as the only public entrypoint. The stage skills keep each handoff narrow, but the script remains the source of truth for workflow enforcement.

## Required sequence

1. Collect target, auth, safety, and baseline inputs.
2. Create or update `.agent/session/web-ux-gremlin-plan.yaml`.
3. Complete the baseline flow and gremlin scenarios.
4. Run `workflow-status --phase plan`, then `check` and `coverage`; fix plan gaps before continuing.
5. Run `workflow-status --phase generate`, then `generate-playwright`.
6. Implement `.agent/generated/web-ux-gremlin.spec.ts` by replacing `TODO:` steps and removing `requireImplementation(...)` guards.
7. Run `workflow-status --phase execute`; run Playwright only after this gate passes.
8. Run `workflow-status --phase ingest`, then `ingest`.
9. Run `workflow-status --phase report`, then `report` and `gate` when needed.

If any `workflow-status --phase <next>` command fails, repair the reported upstream artifact and rerun the same gate before continuing.

## Required artifacts

- `.agent/session/web-ux-gremlin-plan.yaml`
- `.agent/session/web-ux-gremlin-workflow.json`
- `.agent/generated/web-ux-gremlin.spec.ts`
- `.agent/reports/web-ux-gremlin/*`

## Gremlin scenario requirements

Each scenario should include:

- `category`
- `risk_level`
- assertion(s)
- explicit recovery expectation

High/critical scenarios should include bug indicators.

## Reporting

Plan-only reports are supported. Add `--results` to include execution outcomes.
Reports include executive summary, pass rate, severity score/band, scenario rollup, findings, suspected bugs, accessibility issues, and recovery behavior.

## Anti-patterns

- Omitting baseline flow
- Missing recovery expectations
- Missing assertions
- Failing to validate before execution

## Final output

When asked to complete this workflow, include:

- plan path and status
- scenario count and mode(s)
- generated artifacts
- validation results
- remaining blockers and safety notes
