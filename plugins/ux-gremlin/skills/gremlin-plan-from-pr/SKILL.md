---
name: gremlin-plan-from-pr
description: Analyze a pull request change set and suggest or generate UX Gremlin coverage for impacted routes and components.
argument-hint: "Provide the PR number, diff context, or changed files that should drive the plan"
user-invocable: true
---

# Plan From PR

## Purpose

Use this skill to bootstrap UX Gremlin coverage directly from a PR instead of starting from scratch.

## When to Use

- The user asks what to test for a PR.
- You want change-aware route/component coverage suggestions.

## When Not to Use

- There is no PR or changed-file context to inspect.
- The task is only to explain a known scenario.

## Required Inputs

- PR number or changed file list.
- Any route ownership, risk context, or release-critical areas.

## Output Artifacts

- A PR-focused plan draft in `.agent/session/ux-gremlin-plan.yaml` or `.agent/session/ux-gremlin-pr-plan.md`.
- Suggested scenario coverage mapped to touched UI areas.

## CLI Entry Point

`node skills/gremlin-plan-from-pr/scripts/plan-from-pr.mjs`

## Workflow Notes

- Hand off to `validate-plan` after the PR-derived plan is authored.
- Prefer changed routes, forms, and stateful UI over purely cosmetic edits.
