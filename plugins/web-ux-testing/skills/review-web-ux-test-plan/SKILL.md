---
name: review-web-ux-test-plan
description: 'Use when reviewing YAML web UX test plans for quality, safety, completeness, schema validity, and execution suitability. Use for plan audits, risk reviews, Playwright MCP readiness, accessibility coverage checks, auth/session safety, regression-candidate review, and finding missing scenarios. Do not use for creating a new plan unless the user asks for a revised replacement after review.'
argument-hint: 'Provide the plan path or YAML content plus the target runner and environment if known.'
user-invocable: true
---

# Review Web UX Test Plan

Review an existing web UX testing plan and return prioritized findings that help the user make it executable, safe, and useful.

## Required inputs

- Plan YAML path or content
- Intended runner when specified; default to Playwright MCP when unspecified
- Target environment and base URL when available
- Auth/session strategy when available

If the plan path is missing, ask for it or inspect the default `web-ux-test/plan.yaml` when working in a repository that follows this plugin layout.

## Runner selection

- If the target runner is missing, review the plan for Playwright MCP readiness by default.
- Treat Playwright MCP plans as exploratory or browser-execution plans that need evidence, branches, stop conditions, and safe auth/session handling.
- Treat Playwright CLI plans as regression automation only when the plan explicitly includes deterministic setup, `executable_steps`, generated tests, CI intent, or ARIA baselines.
- Treat hybrid plans as MCP discovery plus selected CLI regression conversion.

## Procedure

1. Run `node skills/review-web-ux-test-plan/scripts/validate-plan.mjs web-ux-test/plan.yaml` when a plan file is available. This performs schema validation and safety linting.
2. If the validation script is not found or fails to execute, note this in the output, skip automated validation, and proceed with manual schema review against the required fields.
3. If the YAML cannot be parsed at all, report the parse error location, stop the review, and ask the user to fix syntax before resubmitting.
4. Treat validation errors as blocking issues before qualitative review. Required workflow fields include scenario evidence, `stop_conditions`, and at least one of `steps` or `branches`.
5. Check safety next: credentials, destructive actions, production scope, external service side effects, and stop conditions.
6. Review scenario quality: clear goal, observable entry, branches, checks, issue indicators, evidence, and regression-candidate flags.
7. Review execution suitability for the selected runner. Exploratory MCP plans should include evidence and branches; CLI-oriented plans should isolate setup, data, and deterministic assertions.
8. Compare coverage against the scenario library categories and flag important missing areas.
9. Return findings ordered by severity with concrete fixes. Include revised YAML only when requested or when the fix is 5 lines or fewer of YAML.

## Review criteria

Check for:

- clear testing scope
- clear environment
- auth strategy
- saved-session handling
- non-destructive safety limits
- scenario priority
- stable selectors
- observable decision signals
- conditional branches
- accessibility coverage
- console error checks
- network failure checks
- responsive layout checks
- empty/loading/error states
- data persistence checks
- duplicate-submit checks
- form validation checks
- keyboard navigation checks
- evidence capture requirements

## Output format

Return:

1. Summary judgment
2. Critical issues
3. Recommended improvements
4. Revised YAML, if requested
5. Suggested Playwright CLI regression tests

Include the validation command result when it was run. If validation was not run, say why.

If validation fails, put those failures first and do not call the plan execution-ready.

## Strong opinions

Flag these as problems:

- credentials in YAML
- pixel-coordinate steps
- no auth strategy
- no destructive-action policy
- no accessibility checks
- no network or console checks
- no conditional handling for modals/loading/auth state
- vague checks such as "verify page works"

## ARIA review criteria

If the plan includes ARIA or accessibility-tree snapshots, check for:

- snapshots that are too broad
- dynamic content in baselines
- missing role/name/state checks
- missing form validation semantics
- missing dialog/menu/focus semantics
- private user content in `.aria.yml` baselines
- missing manual-review policy for snapshot updates
