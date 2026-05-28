---
name: apply-common-scenarios
description: 'Use when adding reusable scenario-library coverage to an existing web UX YAML test plan. Use for auth/session scenarios, forms, navigation, state recovery, accessibility, responsive coverage, loading/empty/error states, and regression-candidate tagging. Do not use for creating a plan from scratch; use generate-web-ux-test-plan first.'
argument-hint: 'Provide the target plan path and the scenario groups or risk areas to add.'
user-invocable: true
---

# Apply Common Scenarios

Add standard scenario modules from the repository scenario library to an existing plan without duplicating custom YAML or weakening safety rules.

## Required inputs

- Target plan path, usually `web-ux-test/plan.yaml`
- Scenario groups requested by the user or inferred from the app risk profile
- Auth requirements and session strategy
- Runner type and environment
- Any destructive-action constraints

If the user gives no target plan, default to `web-ux-test/plan.yaml`. If the file does not exist, switch to the generate-plan workflow first.

## Procedure

1. Inspect `scenario-library/registry.yaml` to identify available modules and their `applies_when` conditions.
2. Match scenarios to plan facts instead of adding every module. Prefer high-priority scenarios for primary workflows, auth, forms, accessibility, and error states.
3. Preserve existing scenario IDs and avoid duplicates. If a scenario already exists, refine it rather than adding a second copy.
4. Add scenarios to the most relevant area file or `test_areas` entry, keeping IDs aligned with the registry where possible.
5. Include observable checks, issue indicators, evidence requirements, and stop conditions for every added scenario.
6. Mark stable, high-value scenarios as `convert_to_regression_test: true` when they can run repeatably without production data or manual-only state.
7. Validate with `npm run validate:plan -- web-ux-test/plan.yaml` or `node scripts/validate-plan.mjs web-ux-test/plan.yaml` and fix schema errors.

Use `npm run list:scenarios` or `node scripts/list-scenarios.mjs` when you need a quick registry summary.

## Supported scenario groups

- Authentication pass-through
- Manual login pause
- Expired session
- Logout behavior
- Bad cache / clear cache
- Reload and hard refresh recovery
- Input field validation
- Form submission validation
- Required fields
- Empty states
- Loading states
- API error states
- Modal handling
- Keyboard navigation
- Responsive layout
- Browser back/forward behavior

## Selection defaults

- Auth required: add pass-through, manual-login pause or saved-session handling, expired session, and logout clearing.
- Forms present: add input validation, required fields, duplicate submit, and accessible form semantics.
- Client routing: add main navigation, browser history, and deep-linking where applicable.
- Async data: add loading, empty, and API error states.
- Responsive scope: add mobile, tablet, and desktop scenarios matching requested viewports.
- Accessibility enabled: add keyboard navigation, accessible names, focus management, and ARIA snapshots when stable semantic baselines are valuable.

## Rules

- Do not add credentials to YAML.
- Prefer observable signals over implementation assumptions.
- Add issue indicators and evidence requirements.
- Mark high-value stable scenarios as regression test candidates.
- Avoid destructive actions unless explicitly allowed.
- Prefer reusable scenario templates over duplicated custom YAML.
- Use `scenario-library/registry.yaml` as the source of available scenario modules.
- Do not add a module when its preconditions are clearly false.
- Summarize which modules were added, skipped, or need user confirmation.
