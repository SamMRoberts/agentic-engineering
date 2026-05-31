---
name: auth-state
description: 'Use when a test plan needs authentication, to capture and reuse Playwright storage state instead of logging in on every run. Use for saving signed-in browser state to a file referenced by WEB_UX_STORAGE_STATE, and for verifying that a saved state is still valid before a run. Do not inline credentials into plans or specs; reference environment variables only.'
argument-hint: 'Provide the login URL/steps and the storage-state output path.'
user-invocable: true
---

# Auth State

Capture and verify Playwright storage state so authenticated plans run without
repeating login, and without embedding secrets.

## When to use

- A plan's `preconditions` require an authenticated session.
- A previously saved storage state may have expired and needs verification.

## Inputs

- Login workflow (URL + credential entry steps) or an existing login plan.
- Credentials via environment variables only (e.g. `${WEB_UX_USER}`,
  `${WEB_UX_PASSWORD}`).
- Output path for the storage-state JSON (e.g. `.auth/storage-state.json`).

## Procedure

1. Save storage state by performing the login flow once:

   ```bash
   node scripts/save-storage-state.mjs --url ${WEB_UX_BASE_URL}/login --out .auth/storage-state.json
   ```

2. Verify a saved state is still valid before a run:

   ```bash
   node scripts/verify-storage-state.mjs .auth/storage-state.json
   ```

3. Point execution at the state via `WEB_UX_STORAGE_STATE`.

## Output

- A storage-state JSON file (git-ignored).
- A validity check result; if invalid, re-run the save step.

## Scripts

- `scripts/save-storage-state.mjs` — runs the login flow and persists state.
- `scripts/verify-storage-state.mjs` — confirms the state still authenticates.

## Guardrails

- Storage-state files contain session tokens: they are git-ignored and must
  never be committed. See `docs/security.md`.
- Credentials come from environment variables only; the validator rejects
  literal secrets in plans.
