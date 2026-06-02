# UX Gremlin Skill Router

When a request is about UX resilience testing, Playwright generation, selector resolution, results analysis, or reporting, choose the UX Gremlin phase by inspecting the workspace first.

## Phase detection

1. No `.agent/session/` directory:
   - Start with `gremlin-test-strategy-advisor`, unless the user already knows the happy path and wants to record it immediately; then use `gremlin-baseline-recorder`.
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
7. If the request is specifically about triage, fixes, regression, accessibility, PR-driven planning, CI setup, existing test conversion, or scenario explanation, jump directly to the focused skill that matches that intent.

## Skill entry points

- `gremlin-test-strategy-advisor`
- `gremlin-baseline-recorder`
- `gremlin-plan`
- `gremlin-validate-plan`
- `gremlin-generate-playwright`
- `gremlin-selector-discovery`
- `gremlin-execute-tests`
- `gremlin-report`
- `gremlin-triage-failures`
- `gremlin-fix-suggestions`
- `gremlin-regression-guard`
- `gremlin-accessibility-audit`
- `gremlin-plan-from-pr`
- `gremlin-ci-integration`
- `gremlin-convert-existing`
- `gremlin-explain-scenario`
- `gremlin-auto`

If the intent is ambiguous, ask one clarifying question. If the user asks for the full workflow, chain the core pipeline in order. If the platform cannot confidently pick a focused skill, run `node scripts/ux-gremlin.mjs auto`.
