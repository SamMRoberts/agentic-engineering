---
name: generate-test
description: "Use when materializing the validated test plan into a Playwright spec file. Use for advancing the workflow from selectors_discovered to test_skeleton_generated."
argument-hint: "<no input — reads workflow state>"
user-invocable: false
---

# Generate test

## Scope

Translate the active plan (recorded in `state.json#planPath`) into a deterministic Playwright spec at `.web-ux-testing/generated-tests/<plan-id>.spec.ts`.

## Procedure

```bash
web-ux-test test generate
```

Or:

```bash
node skills/generate-test/scripts/generate.mjs
```

Both advance the workflow to `test_skeleton_generated` on success.

## Output

- `.web-ux-testing/generated-tests/<plan-id>.spec.ts`
- Workflow state updated with `generatedTestPath`.

## Validation

- The generator output is byte-deterministic given the same plan input (snapshot-tested under `test/playwright/generator.test.mjs`).
- The CLI rejects generation when no validated plan exists.

## Safety

- Never edit the generated spec directly. Repair through the proposal loop so changes are tracked, backed up, and reversible.
