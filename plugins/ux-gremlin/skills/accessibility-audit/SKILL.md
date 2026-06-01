---
name: accessibility-audit
description: Perform a focused accessibility pass with UX Gremlin context, including axe/WCAG/focus behavior concerns.
argument-hint: "Describe the route, component, and accessibility concerns or standards you need to assess"
user-invocable: true
---

# Accessibility Audit

## Purpose

Use this skill when the UX resilience task is primarily about accessibility behavior and compliance risk.

## When to Use

- The user asks for an a11y audit, WCAG mapping, or focus-trap analysis.
- Accessibility deserves first-class treatment beyond the general gremlin plan.

## When Not to Use

- The task is a generic plan or report request with no deeper accessibility focus.
- You only need to execute an existing spec.

## Required Inputs

- The route or flow to audit.
- Relevant user roles, assistive technology concerns, and any axe output.

## Output Artifacts

- Accessibility findings in `.agent/reports/ux-gremlin/accessibility-audit.md`.
- WCAG-oriented recommendations and scenario ideas to add back into the plan.

## CLI Entry Point

`node skills/accessibility-audit/scripts/accessibility-audit.mjs`

## Workflow Notes

- Focus on keyboard-only behavior, announcements, labels, and focus management.
- Coordinate with `report-gremlins` for final publication.
