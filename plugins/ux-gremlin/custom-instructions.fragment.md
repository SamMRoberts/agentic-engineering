# UX Gremlin Skill Router

When a request is about UX resilience testing, Playwright generation, selector resolution, results analysis, or reporting, choose the UX Gremlin phase by inspecting the workspace first.

## Phase detection

1. No `.agent/session/` directory:
   - Start with `gremlin-test-strategy-advisor`, unless the user already knows the happy path and wants to record it immediately; then use `gremlin-baseline-recorder`.
2. `.agent/session/ux-gremlin-plan.yaml` missing:
   - Use `gremlin-plan-gremlins`.
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

- `node skills/gremlin-test-strategy-advisor/scripts/test-strategy-advisor.mjs`
- `node skills/gremlin-baseline-recorder/scripts/baseline-recorder.mjs`
- `node skills/gremlin-plan-gremlins/scripts/plan-gremlins.mjs`
- `node skills/gremlin-validate-plan/scripts/validate-plan.mjs`
- `node skills/gremlin-generate-playwright/scripts/generate-playwright.mjs`
- `node skills/gremlin-selector-discovery/scripts/selector-discovery.mjs`
- `node skills/gremlin-execute-tests/scripts/execute-tests.mjs`
- `node skills/gremlin-report/scripts/report-gremlins.mjs`
- `node skills/gremlin-triage-failures/scripts/triage-failures.mjs`
- `node skills/gremlin-fix-suggestions/scripts/fix-suggestions.mjs`
- `node skills/gremlin-regression-guard/scripts/regression-guard.mjs`
- `node skills/gremlin-accessibility-audit/scripts/accessibility-audit.mjs`
- `node skills/gremlin-plan-from-pr/scripts/plan-from-pr.mjs`
- `node skills/gremlin-ci-integration/scripts/ci-integration.mjs`
- `node skills/gremlin-convert-existing/scripts/convert-existing.mjs`
- `node skills/gremlin-explain-scenario/scripts/explain-scenario.mjs`
- `node skills/gremlin-auto/scripts/ux-gremlin-auto.mjs`

If the intent is ambiguous, ask one clarifying question. If the user asks for the full workflow, chain the core pipeline in order. If the platform cannot confidently pick a focused skill, run `node scripts/ux-gremlin.mjs auto`.
