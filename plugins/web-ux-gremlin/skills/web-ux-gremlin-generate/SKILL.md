---
name: web-ux-gremlin-generate
description: "Private helper for web-ux-gremlin. Use only to convert one approved UX bug-hunt scenario into a maintainable Playwright spec with deterministic standard or gremlin-mode assertions."
argument-hint: "Plan scenario, test file path, seed data, mode, intensity, high-chaos approval, run contract"
user-invocable: false
---

# Web UX Gremlin Generate

Generate one Playwright spec per approved scenario unless grouping was explicitly requested.

## Procedure

1. Use the generate handoff from `../web-ux-gremlin/checklists/stage-handoffs.md`.
2. Prefer accessible locators, visible assertions, deterministic setup, and user-observable outcomes.
3. Preserve plan intent in concise comments only when it helps connect a step to a UX risk.
4. For gremlin mode, include at least the selected intensity count of explicit gremlin actions when scenario relevance allows, plus recovery assertions.
5. Avoid arbitrary sleeps, pixel coordinates, hidden implementation details, `networkidle`, random fuzzing, and unsafe mutations.

## Output

Return created or changed test files, scenario coverage, run contract, and the narrowest recommended command.
