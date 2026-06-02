---
name: gremlin-plan-gremlins
description: Generate or update `ux-gremlin-plan.yaml` from the baseline flow and strategy decisions.
argument-hint: "Provide the target route, baseline flow, safety constraints, and any strategy notes to encode in the plan"
user-invocable: true
---

# Plan Gremlins

## Purpose

Use this skill to create the canonical UX Gremlin plan artifact that downstream phases consume.

## When to Use

- A baseline flow exists and you are ready to author the plan YAML.
- The user asks to create a plan or generate gremlins for a page or journey.

## When Not to Use

- The task is only to validate, execute, or report on an already-authored plan.
- You still need to interview the user about what to test.

## Required Inputs

- Baseline happy-path flow and expected result.
- Selected gremlin categories, risk levels, and safety notes.
- Preferred execution mode and verification commands.

## Output Artifacts

- `.agent/session/ux-gremlin-plan.yaml`.
- A scaffolded report directory at `.agent/reports/ux-gremlin/`.

## CLI Entry Point

`node skills/gremlin-plan-gremlins/scripts/plan-gremlins.mjs`

## Workflow Notes

- Run `validate-plan` after authoring or updating the plan.
- The initial CLI entry point bootstraps the plan template through the legacy runtime.
