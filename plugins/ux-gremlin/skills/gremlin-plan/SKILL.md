---
name: gremlin-plan
description: Generate or update `ux-gremlin-plan.yaml`, including strategy, baseline capture, accessibility coverage, PR context, and existing-test conversion notes.
argument-hint: "Provide the target route, baseline flow, safety constraints, and any strategy notes to encode in the plan"
user-invocable: true
---

# Plan Gremlins

## Purpose

Use this skill to create the canonical UX Gremlin plan artifact that downstream phases consume.
It now owns the former strategy, baseline recorder, accessibility-planning, PR-aware planning, and existing-test conversion entrypoints.

## When to Use

- A baseline flow exists and you are ready to author the plan YAML.
- The user asks to create a plan or generate gremlins for a page or journey.
- The user asks what to test, wants to record the happy path, provides PR context, or wants to seed the plan from existing end-to-end tests.

## When Not to Use

- The task is only to validate, execute, or report on an already-authored plan.
- The task is only about generated-spec readiness after the plan already exists.

## Required Inputs

- Baseline happy-path flow and expected result.
- Selected gremlin categories, risk levels, and safety notes.
- Preferred execution mode and verification commands.
- Optional PR diff, existing-test file, accessibility concerns, or strategy notes.

## Output Artifacts

- `.agent/session/ux-gremlin-plan.yaml`.
- A scaffolded report directory at `.agent/reports/ux-gremlin/`.

## CLI Entry Point

`node skills/gremlin-plan/scripts/plan-gremlins.mjs`

## Workflow Notes

- Run `validate-plan` after authoring or updating the plan.
- The initial CLI entry point bootstraps the plan template through the legacy runtime.
- Ask concise clarification questions only when target, safety, auth, or destructive-action scope is missing.
- Keep strategy and baseline notes in the plan rather than routing to deprecated advisory skills.
