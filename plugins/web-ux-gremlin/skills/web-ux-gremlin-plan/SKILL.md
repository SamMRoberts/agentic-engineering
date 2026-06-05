---
name: web-ux-gremlin-plan
description: "Private helper for web-ux-gremlin. Use only to create or review scoped Markdown UX bug-hunt plans for standard or gremlin-mode Playwright testing."
argument-hint: "Run contract, target URL/app, flows, UX risks, mode, intensity, safety constraints, planner tools, plan output path"
user-invocable: false
---

# Web UX Gremlin Plan

Create or review a Markdown plan under `specs/` after discovery has passed.

## Procedure

1. Use `../web-ux-gremlin/checklists/stage-handoffs.md` for the plan handoff.
2. If Playwright planner tools are available, invoke `planner_setup_page` exactly once before any browser exploration tool.
3. Explore the browser snapshot first. Use `browser_*` navigation and interaction tools to discover interactive elements, forms, navigation paths, validation, and critical user journeys. Do not take screenshots unless the snapshot and DOM evidence are insufficient.
4. Map primary user flows and critical paths, including materially different user types or starting assumptions when relevant.
5. Define independent scenarios that assume a blank or fresh starting state and can run in any order.
6. Cover happy paths, edge cases, boundary conditions, negative tests, validation, error handling, and recovery expectations.
7. For each scenario, include a clear title, numbered steps, expected outcomes, assumptions, success criteria, and failure conditions.
8. For gremlin mode, read `../web-ux-gremlin/checklists/gremlin-mode.md` and name the tactic, unusual behavior, failure mode, and recovery expectation for each scenario.
9. Keep each scenario safe, deterministic, specific enough for any tester to follow, and scoped to approved fixtures.
10. Save the plan in `specs/`; use `planner_save_plan` when available. Do not overwrite an existing plan unless approved.

## Output

Return the plan path, scenario list, explored surfaces, assumptions, out-of-scope items, run contract, save method, and any blockers.
