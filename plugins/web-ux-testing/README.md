# web-ux-testing

`web-ux-testing` is a GitHub Copilot agent skill pack for generating, reviewing, and operationalizing structured web UX testing plans.

It is designed for workflows that start with exploratory validation using Playwright MCP or an agent browser, then convert high-value findings into durable Playwright CLI regression tests.

## What this pack provides

- A single fast user-facing Copilot agent that runs planning, analysis, and
  reporting inline and delegates only browser/CLI execution
- Isolated least-privilege executor sub-agents for Playwright MCP exploration,
  validated plan execution, and Playwright CLI runs
- Skills for generating, reviewing, extending, executing, summarizing, troubleshooting, and converting test plans
- YAML schemas for plans, config, scenarios, and findings
- Reusable scenario modules
- Execution profiles
- Checklists
- Utility scripts

## Modes

The agent picks the lightest mode that satisfies the request and names it before
starting. Default is **quick-scan** so the common case is fast.

- **quick-scan** (default): URL + workflow → exploratory browser pass → concise
  findings. No plan files.
- **planned-run**: generate/validate a YAML plan, then batch-execute scenarios with
  inline `progress.md` checkpoints.
- **regression-generation**: convert confirmed findings/`executable_steps` into
  durable Playwright CLI tests.
- **full-audit** (opt-in): requirements → plan → validate → execute → analyze →
  report.

## Full-audit lifecycle

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
4. Invoke `web-ux-testing-agent` and describe what you want. Give it a base URL and a
   workflow and it runs a quick scan by default; ask for a plan, regression tests, or a
   full audit to escalate. It only asks blocking questions, runs planning and analysis
   itself, and delegates only browser and CLI execution to isolated sub-agents.

Example requests:

- `Create a web UX testing plan for our staging dashboard. Use saved browser auth and cover navigation, forms, mobile, loading states, and accessibility.`
- `Review web-ux-test/plan.yaml and tell me whether it is safe to run with Playwright MCP.`
- `Run the validated checkout scenario with Playwright MCP and write findings to web-ux-test/results.yaml.`
- `Run each scenario in the validated plan and keep web-ux-test/progress.md updated so I can resume later.`
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

`web-ux-testing-agent` is the single user-facing agent. It does requirements
gathering, plan creation/review, scenario application, progress tracking, results
analysis, reporting, test generation, and safety review **itself** by reading the
relevant skill and acting on it. This keeps the common path fast: no orchestrator
hop and no separate agent spin-up for read/write work.

It delegates only the three things that need an isolated tool scope it deliberately
does not hold:

- `web-ux-playwright-mcp-explorer` performs exploratory discovery with Playwright MCP (powers quick-scan).
- `web-ux-playwright-mcp-executor` runs a batch of validated scenarios with Playwright MCP in one session.
- `web-ux-playwright-cli-executor` runs generated Playwright CLI tests.

These executor sub-agents are not meant to be invoked directly by users; the narrow
tool scopes preserve safety boundaries (no app-code edits, no broad shell, no
credential handling).

Requirements are single-pass: if you provide a base URL and a workflow, the agent
proceeds and asks only blocking questions. It may infer details from the codebase
when at least two signals agree, but it surfaces conflicts with your explicit
statements as questions rather than overriding them.

During execution the agent hands the executor the full remaining scenario list. The
executor runs them in one session and updates `web-ux-test/progress.md` after each
scenario, so users can track progress and resume interrupted runs from the first
non-terminal scenario.

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
