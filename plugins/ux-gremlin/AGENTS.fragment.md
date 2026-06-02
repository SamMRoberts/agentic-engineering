# UX Gremlin Skill Router

When the task involves UX resilience testing, Playwright scenario generation, selector discovery, result triage, or reporting for a web flow, use the focused UX Gremlin skills instead of the monolithic workflow.

## Choose the skill from intent + artifact state

1. Match the user's request to the closest skill:
   - Strategy / coverage questions → `node skills/gremlin-test-strategy-advisor/scripts/test-strategy-advisor.mjs`
   - Baseline capture / walkthrough → `node skills/gremlin-baseline-recorder/scripts/baseline-recorder.mjs`
   - Plan creation → `node skills/gremlin-plan-gremlins/scripts/plan-gremlins.mjs`
   - Plan validation / readiness → `node skills/gremlin-validate-plan/scripts/validate-plan.mjs`
   - Playwright generation → `node skills/gremlin-generate-playwright/scripts/generate-playwright.mjs`
   - Selector resolution → `node skills/gremlin-selector-discovery/scripts/selector-discovery.mjs`
   - Execution / ingestion → `node skills/gremlin-execute-tests/scripts/execute-tests.mjs`
   - Reporting / severity gates → `node skills/gremlin-report-gremlins/scripts/report-gremlins.mjs`
   - Failure triage → `node skills/gremlin-triage-failures/scripts/triage-failures.mjs`
   - Fix recommendations → `node skills/gremlin-fix-suggestions/scripts/fix-suggestions.mjs`
   - Regression comparison → `node skills/gremlin-regression-guard/scripts/regression-guard.mjs`
   - Accessibility deep dive → `node skills/gremlin-accessibility-audit/scripts/accessibility-audit.mjs`
   - PR-aware planning → `node skills/gremlin-plan-from-pr/scripts/plan-from-pr.mjs`
   - CI setup → `node skills/gremlin-ci-integration/scripts/ci-integration.mjs`
   - Existing test conversion → `node skills/gremlin-convert-existing/scripts/convert-existing.mjs`
   - Scenario explanation → `node skills/gremlin-explain-scenario/scripts/explain-scenario.mjs`

2. If the prompt is broad or the platform cannot explicitly choose among skills, run:

   ```bash
   node scripts/ux-gremlin.mjs auto
   ```

## Artifact-based phase detection

Check the workspace before choosing the next step:

- No `.agent/session/` directory → start with `gremlin-test-strategy-advisor` (or `gremlin-baseline-recorder` if the happy path is already known)
- `.agent/session/ux-gremlin-plan.yaml` missing → use `gremlin-plan-gremlins`
- Plan exists but `.agent/session/ux-gremlin-plan.check.ok` is missing or stale → use `gremlin-validate-plan`
- Plan validated and `.agent/generated/ux-gremlin.spec.ts` missing → use `gremlin-generate-playwright`
- Spec exists but `.agent/session/ux-gremlin-results.json` is missing → use `gremlin-execute-tests`
- Results exist but `.agent/reports/ux-gremlin/report.md` is missing → use `gremlin-report-gremlins`

## Sequencing rules

- If intent is ambiguous, ask one clarifying question.
- If the user asks to do everything end-to-end, chain:
  `gremlin-test-strategy-advisor` → `gremlin-baseline-recorder` → `gremlin-plan-gremlins` → `gremlin-validate-plan` → `gremlin-generate-playwright` → `gremlin-selector-discovery` → `gremlin-execute-tests` → `gremlin-report-gremlins`.
