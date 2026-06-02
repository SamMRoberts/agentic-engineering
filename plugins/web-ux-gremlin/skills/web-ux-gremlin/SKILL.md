---
name: web-ux-gremlin
description: Use to create and validate hostile-but-realistic UX Gremlin plans, generate Playwright specs, and run CLI or MCP execution workflows for UX resilience.
argument-hint: "Target URL or app area, baseline UX flow, auth requirements, risk policy, workflow mode, and execution mode"
user-invocable: true
---

# Web UX Gremlin

Use this skill as the entry point for UX resilience planning and execution.

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
- Execution mode (`cli` default, or `mcp`)
- Safety boundaries (`destructive_actions_allowed`, notes, cleanup expectations)

`manual`
: keep all workflow details in the plan template.

`guided`
: prompts for focus targets, objectives, risk tolerance, and mutation depth.

`auto`
: auto-adds uncommon-path gremlin scenarios from the script while preserving user-defined ones.

`cli`
: execute generated Playwright specs via Playwright CLI (`npx playwright test`).

`mcp`
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
- `workflow-status` -> read or set phase (`init`, `plan`, `generate`, `execute`, `report`)
- `run` -> execute spec (supports `--mode cli|mcp`, supports `--mcp-state`, `--mcp-command`)
- `ingest` -> convert Playwright JSON report to normalized scenario results
- `report` -> produce `report.md`, `report.json`, `report.html`, `report.junit.xml`, `report.pr.md`
- `gate` -> fail when highest open severity meets threshold

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
