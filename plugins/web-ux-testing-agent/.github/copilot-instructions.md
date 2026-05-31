# Copilot instructions — web-ux-testing-agent

This plugin turns step-by-step web UX workflows into structured YAML test plans,
generated Playwright test code, repeatable CLI execution, and readable reports.

## Core policy

- **Playwright CLI is the primary execution engine.** Generate spec files and
  run them with the Playwright CLI for deterministic, repeatable tests.
- **Playwright MCP is for investigation only:** discovering unknown workflows,
  inspecting live pages, generating selectors, debugging failures, and
  recommending plan repairs. Never use MCP as the default runner.
- **Never inline secrets.** Reference credentials via `${ENV_VAR}` only. The
  validator (`lib/plan-validator.mjs`) rejects literal secrets.
- **Prefer accessible locators:** `getByRole`, `getByLabel`, `getByText`,
  `getByTestId`. Avoid brittle CSS/XPath unless a step explicitly requires it.

## Workflow

1. **Plan** — convert the user's goal into a valid YAML plan
   (`schemas/test-plan.schema.json`); validate + normalize with the
   `plan-authoring` skill.
2. **Generate + run** — produce a Playwright spec (one `test.step()` per step)
   and execute via the CLI (`playwright-generation`, `playwright-execution`).
3. **Debug** — only when a deterministic run fails or the UI is unknown, use
   Playwright MCP to inspect the live page and classify the failure
   (`failure-triage`).
4. **Report** — summarize results for humans, linking artifacts
   (`report-generation`).

## Custom agents

See `.github/agents/`:

- **Web UX Planner** — goal → structured plan.
- **Web UX Runner** — plan → spec → CLI run → artifacts.
- **Web UX Debugger** — investigate failures / unknown UI with MCP.
- **Web UX Reporter** — summarize results for humans.

## Handoff prompts

- Planner → Runner: "Plan validated. Generate the spec and run it via the
  Playwright CLI with the configured environment."
- Runner → Debugger: "Run failed at step N. Investigate the live page with
  Playwright MCP and classify the cause."
- Debugger → Planner: "Diagnosis: <category>. Apply this minimal repair and
  re-validate before re-running."
- Runner/Debugger → Reporter: "Summarize this run for the user and link the
  trace, screenshots, and video."

## Guardrails

- Require plan validation before any execution.
- Do not weaken assertions or selectors to force a pass.
- Distinguish product bugs from test issues.
- Storage-state files and credentials are git-ignored; never commit them.
