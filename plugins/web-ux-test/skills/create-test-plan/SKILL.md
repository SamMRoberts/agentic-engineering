---
name: create-test-plan
description: "Use when authoring a new test plan YAML for the web-ux-test workflow. Use for creating .web-ux-testing/plans/<id>.yaml files that match the schema and capture a single user flow."
argument-hint: "<flow goal, target URL, auth posture, expected success signal>"
user-invocable: false
---

# Create test plan

## Scope

Author a single YAML test plan under `.web-ux-testing/plans/<id>.yaml` that validates against `schemas/test-plan.schema.yaml`. One plan per user flow. Multiple unrelated flows should be split into multiple plans.

## Required inputs

- `id` — kebab-case (e.g., `create-page-flow`)
- `name` — short human-readable name
- `target.baseUrl` — fully-qualified URL
- `plan[]` — at least one step with a supported `action`

Refuse to proceed if any required input is missing.

## Procedure

1. Choose a kebab-case `id` matching `^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`.
2. Fill `target.baseUrl`. Default `target.browser: chromium`.
3. If auth is required, set `auth: { required: true, mode: storageState, storageStatePath: .web-ux-testing/auth/user.json }`.
4. Build `plan[]` from the user flow. Use the supported actions: `goto`, `click`, `fillForm`, `waitFor`, `assertVisible`, `assertHidden`, `type`, `press`.
5. Prefer `[data-testid="..."]` selectors. When using text selectors, note this as an assumption.
6. Add at least one `expect` for the final assertion step.

## Output

A file at `.web-ux-testing/plans/<id>.yaml`. Mirror the structure in `test/fixtures/plan-valid-example.yaml`.

## Validation

```bash
web-ux-test plan validate .web-ux-testing/plans/<id>.yaml
```

Or invoke the bundled wrapper:

```bash
node skills/create-test-plan/scripts/validate-plan.mjs .web-ux-testing/plans/<id>.yaml
```

Both exit 0 on success, 1 on schema errors, 2 on usage errors.

## Safety

- Never embed real credentials.
- Never reference paths outside the project.
- Use synthetic test data only.
