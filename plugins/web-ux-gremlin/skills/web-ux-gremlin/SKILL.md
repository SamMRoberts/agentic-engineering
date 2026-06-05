---
name: web-ux-gremlin
description: "Use when hunting user-visible web UX bugs with Playwright, including standard UX regression coverage, gremlin-mode edge cases, UX bug-hunt plans, generated Playwright specs, test execution, failure healing, and run reports."
argument-hint: "Target URL/app, flows or UX risks, standard vs gremlin mode, desired stage, auth/start state, safe fixtures, browser/tool/run preferences"
user-invocable: true
---

# Web UX Gremlin

## Scope

Use this as the single public orchestrator for deterministic Playwright UX bug hunts. It routes work to private stage skills:

- `web-ux-gremlin-discovery`: preflight, target readiness, scope, safety, and run contract.
- `web-ux-gremlin-plan`: Markdown UX bug-hunt plans under `specs/`.
- `web-ux-gremlin-generate`: one Playwright spec per approved scenario under `tests/`.
- `web-ux-gremlin-execute`: narrow Playwright runs and failure capture.
- `web-ux-gremlin-heal`: failure triage, selector/test repair, and product UX bug classification.
- `web-ux-gremlin-report`: Markdown and optional HTML reports under `specs/reports/`.

Default to standard mode unless the user asks for gremlin mode, mayhem, unusual edge cases, resilience pressure, rapid/duplicated actions, strange input, interrupted state, or "release the gremlins".

## Required Gate

Before planning, generating, running, healing, or reporting, collect or infer:

- Target URL or local app start instructions and expected readiness URL.
- Requested flows, UX risks, or bug classes.
- Stage: discover, plan, generate, execute, heal, report, or full workflow.
- Mode: `standard` or `gremlin`.
- Auth model, starting state, seed data, and destructive-action policy.
- Whether safe fixtures are available for mutating flows.
- Browser, Playwright tool, run mode, existing-test policy, and report format.
- Gremlin intensity `1`-`5` only for gremlin mode.

If gremlin mode is requested without intensity, ask exactly: `What gremlin intensity should I use (1-5)?`

Use `checklists/run-contract.md` to normalize these inputs into one run contract before any external effects.

## Stop Conditions

Stop instead of delegating or running when:

- No reachable target URL, already-running page, or clear app start path is available.
- Required execution controls are missing or set to `Other` without an exact alternative.
- Gremlin intensity is missing for gremlin mode.
- Intensity `4` or `5` lacks explicit high-chaos approval for target suitability plus destructive/data-loss risk.
- The flow may touch production data, real accounts, money movement, or irreversible state without explicit approval and safe fixtures.
- Authentication needs secrets not configured outside chat.
- Required Playwright project files, MCP support, or stage agents are unavailable.
- The requested work would overwrite existing tests without approval.

Never ask for passwords, tokens, cookies, API keys, or private data in chat.

## Workflow

1. Run `web-ux-gremlin-discovery` first unless the user only asks for a read-only explanation.
2. For plan work, use `web-ux-gremlin-plan`; plans must be Markdown files under `specs/`.
3. For generation, use `web-ux-gremlin-generate` once per scenario unless the user requests grouped specs.
4. For execution, use `web-ux-gremlin-execute` from the target Playwright project root with the narrowest useful command.
5. For failures, use `web-ux-gremlin-heal` one failure at a time.
6. Finish with `web-ux-gremlin-report` whenever tests were generated, run, healed, or classified.

Keep the scope summary, assumptions, out-of-scope items, auth policy, safety constraints, known artifacts, validation needed, and blockers intact across handoffs.

## Gremlin Mode

Gremlin mode is deterministic resilience testing, not random fuzzing. Use `checklists/gremlin-mode.md` for tactics and safety boundaries.

Apply intensity as the chaos budget:

- `1`: at least one explicit gremlin action plus one recovery assertion.
- `2`: two unusual actions, including one state disruption when relevant.
- `3`: three unusual actions and two recovery assertions.
- `4`: four mixed interaction, input, or path disruptions after high-chaos approval.
- `5`: five layered cross-surface disruptions and at least three recovery assertions after high-chaos approval.

Generated tests must verify user-visible outcomes, feedback, accessibility, or recovery. Avoid arbitrary sleeps, pixel coordinates, hidden implementation details, uncontrolled load, and production mutation.

## Completion

Report files changed, commands run, pass/fail status, UX bugs found or ruled out, healed failures, blocked work, and residual coverage gaps. Do not claim validation that was not actually run.
