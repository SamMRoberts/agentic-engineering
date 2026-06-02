---
name: web-ux-gremlin-discovery
description: Use before planning or execution to collect the target, auth model, safety limits, environment, and baseline UX flow required for a Web UX Gremlin run.
argument-hint: "Target URL or app area, auth expectations, safety boundaries, environment, and baseline flow"
user-invocable: false
---

# Web UX Gremlin Discovery

## Scope

Use this private skill to gather the minimum inputs required before touching the plan or execution artifacts.

Stop when the run has enough detail to create or update `.agent/session/web-ux-gremlin-plan.yaml`.

## Required Inputs

- target URL or app area
- auth expectations
- safety boundary, including destructive-action policy
- environment details
- baseline happy-path flow

If the target, auth policy, or destructive-action boundary is unknown and execution is requested, stop and ask.

## Procedure

1. Confirm whether the user wants planning only or full execution.
2. Capture the target URL, app area, and environment.
3. Capture the auth model, session expectations, and any required test accounts.
4. Capture destructive-action policy, cleanup expectations, and test-data boundaries.
5. Capture the baseline happy path as ordered user actions plus expected end state.
6. Capture whether the workflow mode should be `manual`, `guided`, or `auto`.
7. Capture whether execution should use `playwright-cli` or `playwright-mcp`.
8. Hand off the normalized inputs to the planning skill.

## Output

Produce a concise intake summary covering:

- target
- auth policy
- safety policy
- workflow mode
- execution mode
- baseline flow
- whether execution is in scope

## Validation

Do not proceed to planning if any of the following are missing:

- target
- baseline flow
- destructive-action policy
- execution auth details when execution is requested

## Safety Rules

- Do not invent credentials, accounts, or session state.
- Do not assume destructive actions are allowed.
- Do not proceed to execution planning when the auth boundary is unclear.
