# UX Gremlin Skill Router

When the task involves UX resilience testing, Playwright scenario generation, selector discovery, result triage, or reporting for a web flow, use the focused UX Gremlin skills instead of the monolithic workflow.

## Choose the skill from intent + artifact state

1. Match the user's request to the closest skill:
   - Strategy / coverage questions → `node skills/test-strategy-advisor/scripts/test-strategy-advisor.mjs`
   - Baseline capture / walkthrough → `node skills/baseline-recorder/scripts/baseline-recorder.mjs`
   - Plan creation → `node skills/plan-gremlins/scripts/plan-gremlins.mjs`
   - Plan validation / readiness → `node skills/validate-plan/scripts/validate-plan.mjs`
   - Playwright generation → `node skills/generate-playwright/scripts/generate-playwright.mjs`
   - Selector resolution → `node skills/selector-discovery/scripts/selector-discovery.mjs`
   - Execution / ingestion → `node skills/execute-tests/scripts/execute-tests.mjs`
   - Reporting / severity gates → `node skills/report-gremlins/scripts/report-gremlins.mjs`
   - Failure triage → `node skills/triage-failures/scripts/triage-failures.mjs`
   - Fix recommendations → `node skills/fix-suggestions/scripts/fix-suggestions.mjs`
   - Regression comparison → `node skills/regression-guard/scripts/regression-guard.mjs`
   - Accessibility deep dive → `node skills/accessibility-audit/scripts/accessibility-audit.mjs`
   - PR-aware planning → `node skills/plan-from-pr/scripts/plan-from-pr.mjs`
   - CI setup → `node skills/ci-integration/scripts/ci-integration.mjs`
   - Existing test conversion → `node skills/convert-existing/scripts/convert-existing.mjs`
   - Scenario explanation → `node skills/explain-scenario/scripts/explain-scenario.mjs`

2. If the prompt is broad or the platform cannot explicitly choose among skills, run:

   ```bash
   node scripts/ux-gremlin.mjs auto
   ```

## Artifact-based phase detection

Check the workspace before choosing the next step:

- No `.agent/session/` directory → start with `test-strategy-advisor` (or `baseline-recorder` if the happy path is already known)
- `.agent/session/ux-gremlin-plan.yaml` missing → use `plan-gremlins`
- Plan exists but `.agent/session/ux-gremlin-plan.check.ok` is missing or stale → use `validate-plan`
- Plan validated and `.agent/generated/ux-gremlin.spec.ts` missing → use `generate-playwright`
- Spec exists but `.agent/session/ux-gremlin-results.json` is missing → use `execute-tests`
- Results exist but `.agent/reports/ux-gremlin/report.md` is missing → use `report-gremlins`

## Sequencing rules

- If intent is ambiguous, ask one clarifying question.
- If the user asks to do everything end-to-end, chain:
  `test-strategy-advisor` → `baseline-recorder` → `plan-gremlins` → `validate-plan` → `generate-playwright` → `selector-discovery` → `execute-tests` → `report-gremlins`.
- Keep the deprecated `skills/ux-gremlin/` workflow only for backwards compatibility.
