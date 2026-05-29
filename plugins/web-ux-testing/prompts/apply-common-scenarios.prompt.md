---
description: 'Use when enriching an existing web UX YAML test plan with reusable scenario-library modules for auth, forms, navigation, state recovery, accessibility, responsive, and error-state coverage.'
agent: web-ux-testing-agent
argument-hint: 'Plan path and scenario groups or risk areas to add.'
---

Use [apply-common-scenarios](../skills/apply-common-scenarios/SKILL.md).

Apply common web UX testing scenario modules to the current plan. Default to `web-ux-test/plan.yaml` if no plan path is provided.

Use `scenario-library/registry.yaml` to select relevant scenario modules.

Prioritize:

- authentication handling when auth is required
- reload/cache recovery
- input validation
- duplicate submit prevention
- main navigation
- keyboard navigation
- API error states
- loading and empty states

Avoid adding irrelevant scenarios.
Avoid duplicate scenario IDs.
Do not add credentials or destructive production actions.

Return:

1. Scenario modules added and why
2. Scenario modules skipped and why
3. Any assumptions or missing plan facts
4. Validation result from `npm run validate:plan -- web-ux-test/plan.yaml` when available
