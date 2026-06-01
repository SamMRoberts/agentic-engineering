---
name: selector-discovery
description: Explore the page or codebase to replace generated selector placeholders with real locators.
argument-hint: "Provide the route, component, or generated TODO block that still needs real selectors"
user-invocable: true
---

# Selector Discovery

## Purpose

Use this skill to resolve unknown locators after Playwright generation but before execution.

## When to Use

- Generated specs still contain TODO placeholders or unresolved locator questions.
- The user asks for selectors, locators, or placeholder resolution.

## When Not to Use

- There is no generated spec to improve yet.
- The task is about strategy, reporting, or CI setup.

## Required Inputs

- The generated spec or TODO block to fix.
- Relevant route, component, or accessibility context.

## Output Artifacts

- Selector notes in `.agent/session/ux-gremlin-selector-notes.md`.
- An updated `.agent/generated/ux-gremlin.spec.ts` ready for execution.

## CLI Entry Point

`node skills/selector-discovery/scripts/selector-discovery.mjs`

## Workflow Notes

- Prefer role-based locators and accessible names.
- Escalate to `execute-tests` once the spec is runnable.
