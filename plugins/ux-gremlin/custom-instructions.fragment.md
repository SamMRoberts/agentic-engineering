# UX Gremlin Skill Router

When a request is about UX resilience testing, Playwright generation, selector resolution, results analysis, or reporting, choose from the consolidated UX Gremlin skills by inspecting the workspace first.

## Phase detection

1. No `.agent/session/` directory:
   - Start with `gremlin-plan`.
2. `.agent/session/ux-gremlin-plan.yaml` missing:
   - Use `gremlin-plan`.
3. Plan exists but `.agent/session/ux-gremlin-plan.check.ok` is missing or older than the plan:
   - Use `gremlin-validate-plan`.
4. Plan validated and `.agent/generated/ux-gremlin.spec.ts` is missing:
   - Use `gremlin-generate-playwright`.
5. Spec exists and `.agent/session/ux-gremlin-results.json` is missing:
   - Use `gremlin-execute-tests`.
6. Results exist and `.agent/reports/ux-gremlin/report.md` is missing:
   - Use `gremlin-report`.
7. If the request is specifically about triage, fixes, regression, CI gates, or scenario explanation, use `gremlin-report`. If it is about accessibility planning, PR-driven planning, or existing test conversion, use `gremlin-plan`.

## Skill entry points

- `gremlin-plan`
- `gremlin-validate-plan`
- `gremlin-generate-playwright`
- `gremlin-execute-tests`
- `gremlin-report`
- `gremlin-auto`

Deprecated compatibility skills are retained for one major-version cycle but should not be selected for new work. If the intent is ambiguous, ask one clarifying question. If the user asks for the full workflow, chain the core pipeline in order. If the platform cannot confidently pick a focused skill, run `node scripts/ux-gremlin.mjs auto`.
