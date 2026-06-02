# UX Gremlin Skill Router

When the task involves UX resilience testing, Playwright scenario generation, selector discovery, result triage, or reporting for a web flow, use the focused UX Gremlin skills instead of the monolithic workflow.

## Choose the skill from intent + artifact state

1. Match the user's request to the closest skill:
   - Strategy / coverage questions → `gremlin-test-strategy-advisor`
   - Baseline capture / walkthrough → `gremlin-baseline-recorder`
   - Plan creation → `gremlin-plan`
   - Plan validation / readiness → `gremlin-validate-plan`
   - Playwright generation → `gremlin-generate-playwright`
   - Selector resolution → `gremlin-selector-discovery`
   - Execution / ingestion → `gremlin-execute-tests`
   - Reporting / severity gates → `gremlin-report`
   - Failure triage → `gremlin-triage-failures`
   - Fix recommendations → `gremlin-fix-suggestions`
   - Regression comparison → `gremlin-regression-guard`
   - Accessibility deep dive → `gremlin-accessibility-audit`
   - PR-aware planning → `gremlin-plan-from-pr`
   - CI setup → `gremlin-ci-integration`
   - Existing test conversion → `gremlin-convert-existing`
   - Scenario explanation → `gremlin-explain-scenario`

2. If the prompt is broad or the platform cannot explicitly choose among skills, run:

   ```bash
   node scripts/ux-gremlin.mjs auto
   ```

## Artifact-based phase detection

Check the workspace before choosing the next step:

- No `.agent/session/` directory → start with `gremlin-test-strategy-advisor` (or `gremlin-baseline-recorder` if the happy path is already known)
- `.agent/session/ux-gremlin-plan.yaml` missing → use `gremlin-plan`
- Plan exists but `.agent/session/ux-gremlin-plan.check.ok` is missing or stale → use `gremlin-validate-plan`
- Plan validated and `.agent/generated/ux-gremlin.spec.ts` missing → use `gremlin-generate-playwright`
- Spec exists but `.agent/session/ux-gremlin-results.json` is missing → use `gremlin-execute-tests`
- Results exist but `.agent/reports/ux-gremlin/report.md` is missing → use `gremlin-report`

## Sequencing rules

- If intent is ambiguous, ask one clarifying question.
- If the user asks to do everything end-to-end, chain:
  `gremlin-test-strategy-advisor` → `gremlin-baseline-recorder` → `gremlin-plan` → `gremlin-validate-plan` → `gremlin-generate-playwright` → `gremlin-selector-discovery` → `gremlin-execute-tests` → `gremlin-report`.
