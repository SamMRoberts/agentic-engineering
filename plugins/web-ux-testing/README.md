# web-ux-testing

`web-ux-testing` is a GitHub Copilot agent skill pack for generating, reviewing, and operationalizing structured web UX testing plans.

It is designed for workflows that start with exploratory validation using Playwright MCP or an agent browser, then convert high-value findings into durable Playwright CLI regression tests.

## What this pack provides

- A user-facing Copilot orchestrator agent
- Private role-specific sub-agents for requirements, planning, execution, analysis, and reporting
- Skills for generating, reviewing, extending, executing, summarizing, troubleshooting, and converting test plans
- YAML schemas for plans, config, scenarios, and findings
- Reusable scenario modules
- Execution profiles
- Checklists
- Utility scripts

## Recommended lifecycle

```text
collect input
→ generate plan
→ validate plan
→ apply scenario modules
→ run exploratory UX testing
→ run durable Playwright CLI tests
→ summarize findings
→ analyze results
→ report results
→ convert selected findings to regression tests
```

## Install / usage

1. Copy the `web-ux-testing/` folder into your repository or shared Copilot skills location.
2. Configure GitHub Copilot to use the agent and skills according to your environment.
3. Configure Playwright MCP if you plan to use browser-driven exploration.
4. Invoke `web-ux-testing-agent` and describe the stage you want. The user-facing agent first asks whether to gather guided requirements from you and whether to infer requirements from the codebase, then orchestrates private sub-agents and routes directly to the appropriate skill.

Example requests:

- `Create a web UX testing plan for our staging dashboard. Use saved browser auth and cover navigation, forms, mobile, loading states, and accessibility.`
- `Review web-ux-test/plan.yaml and tell me whether it is safe to run with Playwright MCP.`
- `Run the validated checkout scenario with Playwright MCP and write findings to web-ux-test/results.yaml.`
- `Explore the staging dashboard with Playwright MCP and recommend follow-up scenarios.`
- `Run the generated Playwright CLI regression tests for checkout.duplicate-submit and summarize failures.`
- `Summarize web-ux-test/results.yaml and recommend which findings should become Playwright CLI regression tests.`
- `Create an engineering triage report from the analyzed findings.`
- `Convert the confirmed duplicate-submit finding into a Playwright CLI regression test.`

5. Validate generated or edited plans when the agent has not already done so:

```bash
npm install
node scripts/validate-plan.mjs web-ux-test/plan.yaml
```

6. Run the plan with Playwright MCP, an agent browser, or Playwright CLI depending on the selected profile.
7. Analyze findings using `schemas/web-ux-finding.schema.yaml` or `schemas/web-ux-findings.schema.yaml`.
8. Create a report when the findings are ready for engineering, accessibility, product, or CI review.
9. Convert selected findings into Playwright CLI regression tests.

For stable user-defined steps, add `executable_steps` to scenarios marked `convert_to_regression_test: true`, then generate Playwright specs:

```bash
npm run generate:tests -- --plan web-ux-test/plan.yaml --out tests/web-ux
```

Supported executable actions include `navigate`, `click`, `fill`, `select`, `press`, `assert_visible`, `assert_text`, `assert_url`, and `capture_evidence`.

## Safety defaults

- Do not store credentials in YAML plans.
- Prefer saved browser sessions, manual login pause, environment variables, or secret managers.
- Avoid destructive production actions unless explicitly allowed.
- Prefer observable signals over implementation assumptions.
- Avoid pixel coordinates and fixed sleeps.

## Package structure

```text
web-ux-testing/
  agents/
  skills/
  schemas/
  scenario-library/
  templates/
  checklists/
  profiles/
  scripts/
```

## Agent architecture

Only `web-ux-testing-agent` is intended to be user-facing. It delegates to private role agents:

The orchestrator starts each new request or material scope with a one-time requirements-source gate:

1. Should it ask guided questions to gather requirements from you?
2. Should it infer requirements from the codebase?

When both sources are used, guided user requirements run first and become the baseline. Codebase inference can confirm, extend, or flag conflicts with that baseline, but it must not replace explicit user-stated requirements without confirmation.

- `web-ux-user-requirements` gathers missing user requirements.
- `web-ux-codebase-requirements` infers requirements from repository evidence.
- `web-ux-plan-curator` creates, reviews, extends, and validates plan files.
- `web-ux-test-file-creator` creates Playwright specs and ARIA baselines.
- `web-ux-playwright-mcp-executor` runs validated plans or scenarios with Playwright MCP.
- `web-ux-playwright-mcp-explorer` performs exploratory discovery with Playwright MCP.
- `web-ux-playwright-cli-executor` runs generated Playwright CLI tests.
- `web-ux-results-analyst` analyzes findings, CLI output, and ARIA diffs.
- `web-ux-report-writer` creates audience-specific reports.
- `web-ux-safety-gatekeeper` reviews risky execution or conversion requests.

Internal sub-agents are not meant to be invoked directly by users; they keep tool access narrow and make the orchestrator easier to reason about.

## ARIA snapshot integration

This pack includes optional ARIA-focused testing support for Playwright. Use it when you want to validate semantic UX structure such as landmarks, headings, accessible names, form validation state, dialogs, menus, and status regions.

Added ARIA resources:

- `skills/generate-aria-snapshot-tests/`
- `skills/review-aria-snapshot-tests/`
- `schemas/web-ux-aria-snapshot.schema.yaml`
- `scenario-library/accessibility/aria-*.yaml`
- `templates/aria-snapshot-test.template.ts`
- `templates/aria-snapshot-baseline.template.aria.yml`
- `checklists/aria-snapshot-testing.md`
- `profiles/playwright-cli.aria-regression.yaml`
- `scripts/scaffold-aria-snapshot-test.mjs`
- `scripts/validate-aria-snapshots.mjs`

Example commands:

```bash
npm run scaffold:aria -- --scenario=ARIA-NAV-001 --title="Primary navigation ARIA snapshot" --route=/ --role=navigation --name="Primary navigation" --baseline=primary-navigation.aria.yml
npm run validate:aria -- tests/aria
```

Recommended approach:

1. Use Playwright MCP or an agent browser to discover accessible structure issues.
2. Add ARIA scenarios to the web UX test plan.
3. Convert stable scenarios into Playwright CLI tests with `.aria.yml` baselines.
4. Review snapshot diffs before accepting baseline updates.
