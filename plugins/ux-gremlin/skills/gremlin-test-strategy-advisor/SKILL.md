---
name: gremlin-test-strategy-advisor
description: Interview the user about their app and recommend gremlin categories, priorities, and coverage depth.
argument-hint: "Describe the app, critical journeys, user roles, risks, and what you already know about the flow"
user-invocable: true
---

# Test Strategy Advisor

## Purpose

Use this skill to turn a vague “what should we test?” request into a focused UX Gremlin coverage strategy before plan authoring begins.

## When to Use

- The user is unsure which routes, personas, or failure modes deserve coverage.
- You need to recommend gremlin categories before writing a baseline or plan.
- You want to scope effort for a new UX resilience initiative.

## When Not to Use

- A concrete baseline flow and draft plan already exist.
- The task is to validate, generate, execute, or report on an existing plan.

## Required Inputs

- Application type, route, or product area under test.
- Critical user goals, risky states, and failure consequences.
- Known auth, data, browser, accessibility, or recovery constraints.

## Output Artifacts

- Coverage recommendations to capture in `.agent/session/ux-gremlin-strategy.md`.
- A prioritized list of gremlin categories to carry into `ux-gremlin-plan.yaml`.

## CLI Entry Point

`node skills/gremlin-test-strategy-advisor/scripts/test-strategy-advisor.mjs`

## Workflow Notes

- Ask short clarifying questions when critical context is missing.
- Hand off to `baseline-recorder` or `gremlin-plan` once scope is clear.
