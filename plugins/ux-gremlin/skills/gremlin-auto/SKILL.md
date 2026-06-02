---
name: gremlin-auto
description: Auto-detect the current UX Gremlin phase from workspace artifacts and dispatch the next focused skill.
argument-hint: "Run without arguments to inspect `.agent/session/` and choose the next needed UX Gremlin phase"
user-invocable: true
---

# UX Gremlin Auto

## Purpose

Use this fallback dispatcher when the agent platform cannot manually pick among the focused UX Gremlin skills.

## When to Use

- The platform cannot manually select a custom agent or skill.
- You want the plugin to pick the next focused phase from current artifact state.

## When Not to Use

- The correct focused skill is already obvious and can be invoked directly.
- You need a human clarification before choosing between strategy and baseline capture.

## Required Inputs

- The current workspace artifact state under `.agent/session/`, `.agent/generated/`, and `.agent/reports/`.
- Optional CLI flags such as `--dry-run` when you only want to inspect routing.

## Output Artifacts

- A routed focused-skill invocation.
- Console output describing the chosen next phase and why it was selected.

## CLI Entry Point

`node skills/gremlin-auto/scripts/ux-gremlin-auto.mjs`

## Workflow Notes

- This skill is intentionally thin and delegates to `node scripts/ux-gremlin.mjs auto`.
- Use it as the compatibility layer for Codex, Claude Code, and similar stateless agents.
