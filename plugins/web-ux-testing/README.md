# web-ux-testing

`web-ux-testing` is a GitHub Copilot agent skill pack for generating, reviewing, and operationalizing structured web UX testing plans.

It is designed for workflows that start with exploratory validation using Playwright MCP or an agent browser, then convert high-value findings into durable Playwright CLI regression tests.

## What this pack provides

- A custom Copilot agent profile
- Skills for generating, reviewing, extending, troubleshooting, and converting test plans
- YAML schemas for plans, config, scenarios, and findings
- Reusable scenario modules
- Execution profiles
- Prompt templates
- Checklists
- Utility scripts

## Recommended lifecycle

```text
collect input
→ generate plan
→ validate plan
→ apply scenario modules
→ run exploratory UX testing
→ summarize findings
→ convert selected findings to regression tests
```

## Install / usage

1. Copy the `web-ux-testing/` folder into your repository or shared Copilot skills location.
2. Configure GitHub Copilot to use the agent and skills according to your environment.
3. Configure Playwright MCP if you plan to use browser-driven exploration.
4. Generate a plan using `prompts/generate-web-ux-test-plan.prompt.md`.
5. Validate the generated plan:

```bash
npm install
node scripts/validate-plan.mjs web-ux-test/plan.yaml
```

6. Run the plan with Playwright MCP, an agent browser, or Playwright CLI depending on the selected profile.
7. Summarize findings using `schemas/web-ux-finding.schema.yaml`.
8. Convert selected findings into Playwright CLI regression tests.

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
  prompts/
  scripts/
```

## ARIA snapshot integration

This pack includes optional ARIA-focused testing support for Playwright. Use it when you want to validate semantic UX structure such as landmarks, headings, accessible names, form validation state, dialogs, menus, and status regions.

Added ARIA resources:

- `skills/generate-aria-snapshot-tests/`
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
