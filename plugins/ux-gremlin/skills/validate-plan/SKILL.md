---
name: validate-plan
description: Run plan gates and coverage checks before generation or execution continues.
argument-hint: "Provide the plan path if it is not `.agent/session/ux-gremlin-plan.yaml`"
user-invocable: true
---

# Validate Plan

## Purpose

Use this skill to verify that a UX Gremlin plan is structurally valid, covers required categories, and is ready for downstream phases.

## When to Use

- The plan exists and you need to check readiness.
- The user asks “is this ready?”, “validate”, or “check the plan”.

## When Not to Use

- No plan artifact exists yet.
- You are already working on generated spec execution or reporting.

## Required Inputs

- A plan path, usually `.agent/session/ux-gremlin-plan.yaml`.
- Any context needed to interpret warnings or coverage gaps.

## Output Artifacts

- Validation command output from `workflow-status`, `check`, and `coverage`.
- A success marker at `.agent/session/ux-gremlin-plan.check.ok` when validation passes.

## CLI Entry Point

`node skills/validate-plan/scripts/validate-plan.mjs`

## Workflow Notes

- Treat a missing or stale check marker as a signal that validation must be rerun.
- Hand off to `generate-playwright` only after validation succeeds.
