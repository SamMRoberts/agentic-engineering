---
name: classify-failure
description: "Use after a Playwright run fails. Use for assigning a deterministic failure category before considering a repair."
argument-hint: "<no input — reads workflow state>"
user-invocable: false
---

# Classify failure

## Scope

Read the artifacts under `.web-ux-testing/runs/<lastRunId>/` and assign one of: `selector_not_found`, `timeout`, `navigation_failure`, `auth_failure`, `assertion_failure`, `network_failure`, `application_error`, `unknown`. Advances workflow to `failure_classified`.

## Procedure

```bash
web-ux-test failure classify
```

Or:

```bash
node skills/classify-failure/scripts/classify.mjs
```

## Output

- Workflow state updated: `lastFailureCategory` set; phase becomes `failure_classified`.
- stdout: `{ category, matchedRule, errorSummary }`.

## Validation

- Classifier is rule-based and tested per fixture under `test/fixtures/classifier/`.
- An `unknown` category is a legitimate outcome — do not invent a more specific category.

## Safety

- Never classify a passing run as a failure to force a repair.
- Never write to or modify the run artifacts directly.
