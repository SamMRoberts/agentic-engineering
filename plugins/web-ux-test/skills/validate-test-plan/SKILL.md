---
name: validate-test-plan
description: "Use when verifying an existing test plan YAML before any execution. Use for enforcing the schema gate that the web-ux-test workflow requires before advancing to test generation."
argument-hint: "<path to test plan YAML>"
user-invocable: false
---

# Validate test plan

## Scope

Schema-validate a test plan YAML against `schemas/test-plan.schema.yaml` and, when invoked inside an initialized project, advance the workflow.

## Required inputs

- Path to a YAML file. File must exist and be readable.

## Procedure

```bash
web-ux-test plan validate <path>
```

Or:

```bash
node skills/validate-test-plan/scripts/validate-plan.mjs <path>
```

Both exit 0 on success, 1 on schema errors, 2 on usage errors.

## Output

- On success: writes confirmation to stdout.
- On failure: prints `ERROR <path>: <issue>` lines to stderr, one per violation.

## Safety

- The validator is read-only; it never writes to disk.
- Never claim success when the validator returned non-zero.
