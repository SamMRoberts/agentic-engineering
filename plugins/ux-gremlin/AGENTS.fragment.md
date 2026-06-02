# UX Gremlin Skill Router

When the task involves UX resilience testing, Playwright scenario generation, result analysis, or reporting for a web flow, use the consolidated UX Gremlin skill surface.

## Choose the skill from intent + artifact state

1. Match the user's request to the closest skill:
   - Strategy, baseline capture, accessibility planning, PR-aware planning, or existing-test conversion → `gremlin-plan`
   - Plan validation / readiness → `gremlin-validate-plan`
   - Playwright generation or selector/recipe resolution → `gremlin-generate-playwright`
   - Execution / ingestion → `gremlin-execute-tests`
   - Reporting, severity gates, failure triage, fix recommendations, trend/regression summaries, scenario explanation, or CI gate guidance → `gremlin-report`

2. If the prompt is broad or the platform cannot explicitly choose among skills, run:

   ```bash
   node scripts/ux-gremlin.mjs auto
   ```

## Artifact-based phase detection

Check the workspace before choosing the next step:

- No `.agent/session/` directory → start with `gremlin-plan`
- `.agent/session/ux-gremlin-plan.yaml` missing → use `gremlin-plan`
- Plan exists but `.agent/session/ux-gremlin-plan.check.ok` is missing or stale → use `gremlin-validate-plan`
- Plan validated and `.agent/generated/ux-gremlin.spec.ts` missing → use `gremlin-generate-playwright`
- Spec exists but `.agent/session/ux-gremlin-results.json` is missing → use `gremlin-execute-tests`
- Results exist but `.agent/reports/ux-gremlin/report.md` is missing → use `gremlin-report`

## Sequencing rules

- If intent is ambiguous, ask one clarifying question.
- If the user asks to do everything end-to-end, chain:
  `gremlin-plan` → `gremlin-validate-plan` → `gremlin-generate-playwright` → `gremlin-execute-tests` → `gremlin-report`.
- Do not route new requests to removed compatibility skills.
