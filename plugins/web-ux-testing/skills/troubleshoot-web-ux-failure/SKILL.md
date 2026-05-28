---
name: troubleshoot-web-ux-failure
description: 'Use when diagnosing failures from web UX testing, Playwright MCP exploration, agent browser runs, Playwright CLI regressions, or ARIA snapshot checks. Use for blank screens, stuck loading, auth loops, broken navigation, failed saves, modal/focus issues, keyboard traps, API errors, duplicate submits, responsive breaks, and missing evidence. Do not use for fixing application code unless the user explicitly asks after triage.'
argument-hint: 'Provide the failure summary, plan/scenario ID, URL, logs, screenshots, network failures, and viewport if available.'
user-invocable: true
---

# Troubleshoot Web UX Failure

Diagnose web UX test failures and turn them into focused follow-up scenarios, evidence requests, or regression candidates.

## Required inputs

- Scenario or finding ID when available
- Current URL and route history
- Reproduction steps and expected behavior
- Actual user-visible behavior
- Console errors and failed network requests
- Screenshot or accessibility snapshot when available
- Browser, viewport, auth/session state, and environment
- Scenario plan branch that was active when the failure occurred
- Baseline diffs for ARIA snapshot failures

If evidence is incomplete, identify the smallest evidence set needed before guessing at root cause.

## Procedure

1. Classify the failure category from observable symptoms before proposing fixes.
2. Separate blocking evidence gaps from likely causes. Do not infer credentials, hidden state, or backend behavior without evidence.
3. Build a minimal reproduction path with explicit preconditions, route, actions, and expected assertions.
4. Check whether the existing plan has matching branches for auth, loading, modal, empty, API error, responsive, and accessibility states.
5. Recommend the scenario-library module or custom follow-up scenario that would catch the failure earlier.
6. Decide whether the failure should become a Playwright CLI regression test. Convert only if it is repeatable, safe, and has deterministic setup.
7. For ARIA failures, distinguish expected semantic changes from regressions and require baseline review before accepting updates.

## Common failure categories

- Blank screen
- Stuck loading state
- Auth redirect loop
- Broken navigation
- Failed save
- Stale cache or storage
- Modal cannot close
- Keyboard trap
- API error not surfaced
- Duplicate submit
- Responsive layout break
- ARIA snapshot mismatch
- Missing accessible name or role

## Output

Return:

1. Likely category
2. Missing evidence
3. Minimal reproduction path
4. Suggested scenario module to add
5. Whether the issue should become a Playwright CLI regression test
6. Next evidence to capture or validation command to run
