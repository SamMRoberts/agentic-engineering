---
name: web-ux-gremlin-generate
description: "Private helper for web-ux-gremlin. Use only to convert one approved UX bug-hunt scenario into a maintainable Playwright spec with deterministic standard or gremlin-mode assertions."
argument-hint: "Plan scenario, test file path, seed data, mode, intensity, high-chaos approval, generator tools, run contract"
user-invocable: false
---

# Web UX Gremlin Generate

Generate one Playwright spec per approved scenario unless grouping was explicitly requested.

## Procedure

1. Use the generate handoff from `../web-ux-gremlin/checklists/stage-handoffs.md`.
2. Obtain the approved plan scenario, including steps, verifications, top-level suite name, seed file, and target test file.
3. If Playwright generator tools are available, invoke `generator_setup_page` for the scenario before using browser interaction tools.
4. Manually execute every scenario step and verification with Playwright browser tools in real time. Use the step text as the intent for each tool call.
5. Read the generator log with `generator_read_log`, then immediately write the generated source with `generator_write_test` when that tool is available.
6. Generate a single-test file with an fs-friendly scenario filename. Place it in `test.describe('<top-level plan item>')`; the test title must match the scenario name without ordinal prefixes.
7. Include `// spec: <plan path>` and `// seed: <seed file>` headers when those inputs exist.
8. Add one comment with the plan step text before each step execution. Do not duplicate the comment when one step requires multiple actions.
9. Always apply best practices from the generator log, while still preferring accessible locators, visible assertions, deterministic setup, and user-observable outcomes.
10. For gremlin mode, include at least the selected intensity count of explicit gremlin actions when scenario relevance allows, plus recovery assertions.
11. Avoid arbitrary sleeps, pixel coordinates, hidden implementation details, `networkidle`, random fuzzing, and unsafe mutations.

## Output

Return created or changed test files, scenario coverage, generator log summary, run contract, and the narrowest recommended command.
