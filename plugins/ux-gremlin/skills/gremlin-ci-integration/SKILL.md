---
name: gremlin-ci-integration
description: Generate or configure CI workflow guidance for validating, executing, and publishing UX Gremlin artifacts.
argument-hint: "Describe the CI system, workflow file, and gate behavior you want to add or update"
user-invocable: true
---

# CI Integration

## Purpose

Use this skill to integrate UX Gremlin validation, execution, and report publishing into automation.

## When to Use

- The user asks to set up CI, GitHub Actions, or pipeline gating.
- You need artifact upload or PR comment reporting guidance.

## When Not to Use

- The task is only to author or validate a plan.
- There is no automation context to update.

## Required Inputs

- Target CI platform and existing workflow constraints.
- Desired gates, artifacts, and severity threshold behavior.

## Output Artifacts

- Workflow guidance or generated snippets for `.github/workflows/`.
- A rollout checklist in `.agent/session/ux-gremlin-ci-notes.md`.

## CLI Entry Point

`node skills/gremlin-ci-integration/scripts/ci-integration.mjs`

## Workflow Notes

- Keep validation, execution, and reporting as distinct phases in automation.
- Pair with `report-gremlins` when publishing artifacts or PR summaries.
