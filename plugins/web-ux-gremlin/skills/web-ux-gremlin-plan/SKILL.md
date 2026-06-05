---
name: web-ux-gremlin-plan
description: "Private helper for web-ux-gremlin. Use only to create or review scoped Markdown UX bug-hunt plans for standard or gremlin-mode Playwright testing."
argument-hint: "Run contract, target URL/app, flows, UX risks, mode, intensity, safety constraints, plan output path"
user-invocable: false
---

# Web UX Gremlin Plan

Create or review a Markdown plan under `specs/` after discovery has passed.

## Procedure

1. Use `../web-ux-gremlin/checklists/stage-handoffs.md` for the plan handoff.
2. Define independent scenarios with steps, expected user-visible outcomes, negative cases, and failure modes.
3. For gremlin mode, read `../web-ux-gremlin/checklists/gremlin-mode.md` and name the tactic, unusual behavior, failure mode, and recovery expectation for each scenario.
4. Keep each scenario safe, deterministic, and scoped to approved fixtures.
5. Save the plan in `specs/`; do not overwrite an existing plan unless approved.

## Output

Return the plan path, scenario list, assumptions, out-of-scope items, run contract, and any blockers.
