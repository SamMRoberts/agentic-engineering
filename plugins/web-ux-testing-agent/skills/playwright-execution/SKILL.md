---
name: playwright-execution
description: 'Use when executing generated Playwright spec files through the Playwright CLI as the primary, deterministic runner, and when collecting the resulting artifacts (JSON report, traces, screenshots, videos). Use for repeatable step-by-step regression runs. Do not use Playwright MCP for deterministic execution; MCP is reserved for discovery and failure investigation (see failure-triage).'
argument-hint: 'Provide the spec or plan id to run and the target environment variables.'
user-invocable: true
---

# Playwright Execution

Run deterministic tests through the Playwright CLI and collect artifacts. The
CLI is the **primary execution engine**; do not use MCP as the default runner.

## When to use

- A generated spec needs to be executed repeatably.
- A run's artifacts (report JSON, trace, screenshots, video) must be collected
  and normalized for reporting.

## Inputs

Environment variables consumed by `runner/playwright.config.ts`:

- `WEB_UX_BASE_URL` — base URL under test.
- `WEB_UX_STORAGE_STATE` — path to saved auth state (optional; see `auth-state`).
- `WEB_UX_BROWSER` — `chromium` (default), `firefox`, or `webkit`.
- `WEB_UX_TEST_DIR`, `WEB_UX_RESULTS_DIR` — spec and output locations.

## Procedure

1. Run the tests via the CLI wrapper:

   ```bash
   node scripts/run-playwright-tests.mjs --plan path/to/plan.yaml --report-dir reports/<run-id>
   ```

   This shells out to `npx playwright test --reporter=json` with traces,
   screenshots, and video on failure.
2. Collect and normalize artifacts into the run directory:

   ```bash
   node scripts/collect-artifacts.mjs --report-dir reports/<run-id> --results test-results
   ```

## Output

- `report.json` (normalized) plus raw Playwright JSON.
- `trace.zip`, screenshots, and video paths recorded in the report.

## Scripts

- `scripts/run-playwright-tests.mjs` — CLI runner wrapper.
- `scripts/collect-artifacts.mjs` — gathers and indexes artifacts.

## Guardrails

- Keep execution deterministic: no live exploration here.
- On failure, hand off to `failure-triage` and `report-generation`; do not retry
  blindly or loosen assertions to force a pass.
