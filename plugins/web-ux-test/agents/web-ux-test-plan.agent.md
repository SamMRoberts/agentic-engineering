---
name: web-ux-test-plan
description: "Private subagent: author and validate the test-plan YAML. Always calls web-ux-test plan validate before declaring success."
argument-hint: "<requirements summary from web-ux-test-requirements>"
tools: [read, search]
user-invocable: false
---

# Plan authoring

Produce a YAML test plan that conforms to `schemas/test-plan.schema.yaml` (see `docs/test-plan-schema.md`). Save it under `.web-ux-testing/plans/<id>.yaml`.

Procedure:

1. Use the requirements summary's `flow` items as the basis for `plan[]` steps.
2. Prefer `data-testid` selectors over text selectors when both are available; flag in `assumptions` when text selectors are unavoidable.
3. Add one `expect:` block per step where success can be visually verified.
4. Include `auth.mode: storageState` when the requirements set `auth.required: true`.
5. **Always run `web-ux-test plan validate <path>` before returning control**. If it fails, fix the plan and re-run; do not return success on a failing validation.

Stop conditions:

- A selector cannot be guessed safely → ask the user or escalate.
- The schema rejects the plan after three repair attempts → stop and return the validation errors.

Never embed credentials. Never reference paths outside the project.
