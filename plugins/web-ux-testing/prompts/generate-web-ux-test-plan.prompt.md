---
description: 'Use when creating a structured YAML web UX test plan for Playwright MCP, an agent browser, Playwright CLI, or a hybrid discovery-to-regression workflow.'
agent: web-ux-testing-agent
argument-hint: 'App name, base URL, environment, auth strategy, key workflows, risk areas, and preferred runner.'
---

Use [generate-web-ux-test-plan](../skills/generate-web-ux-test-plan/SKILL.md).

Create a web UX test plan for this app.

Inputs may come from the chat request, selected text, repository context, or follow-up questions.

Ask follow-up questions if base URL, auth requirement, credentials handling policy, destructive action policy, or workflows in scope are missing. Infer from repository context only when at least two corroborating signals exist, such as matching route definitions, config files, or UI component names, and document those signals as evidence.

The generated plan must include:

- `web-ux-test/plan.yaml`
- `web-ux-test/config.yaml`
- area files under `web-ux-test/areas/`
- auth handling
- conditional branches
- frontend testing best practices
- evidence capture rules
- scenario `stop_conditions`
- severity definitions
- scenarios that should later become Playwright CLI regression tests

The plan should favor exploratory testing with observable signals, not rigid pixel-level scripts.

Do not include credentials.
Do not allow destructive production actions.

After creating or updating files, validate with `npm run validate:plan -- web-ux-test/plan.yaml` when the repository scripts are available. If the validation script is not available, perform a manual structural check of the YAML, including required top-level keys and valid references between files, and note that automated validation was skipped. Fix validation errors before returning the plan. If validation fails after 3 fix attempts, return the plan with remaining errors clearly listed. Report assumptions, validation results, and any warnings that remain.
