# Authentication

Authenticated plans use **Playwright storage state** so tests do not log in on
every run and so credentials never appear in plans or generated specs.

## Policy

- Credentials come from **environment variables only** (e.g. `${WEB_UX_USER}`,
  `${WEB_UX_PASSWORD}`). The validator rejects literal secrets in plans.
- Storage-state files (`.auth/*.json`, `storage-state*.json`) are **git-ignored**
  and must never be committed.

## Declaring auth in a plan

```yaml
environment:
  auth:
    required: true
    strategy: storage_state
    storage_state_path: .auth/staging.json
```

## Capturing storage state

Run the login flow once and persist the signed-in browser state:

```bash
node skills/auth-state/scripts/save-storage-state.mjs \
  --url ${WEB_UX_BASE_URL}/login \
  --out .auth/staging.json
```

See `examples/login-and-save-auth.plan.yaml` for a login plan that captures auth.

## Verifying storage state

Before a run, confirm the saved state still authenticates:

```bash
node skills/auth-state/scripts/verify-storage-state.mjs .auth/staging.json
```

If verification fails, re-capture the state.

## Using storage state at run time

Point the runner at the state via an environment variable:

```bash
WEB_UX_BASE_URL=https://staging.example \
WEB_UX_STORAGE_STATE=.auth/staging.json \
npx playwright test
```

The runner's `playwright.config.ts` reads `WEB_UX_STORAGE_STATE` and applies it
as the browser context's `storageState`.

## Rotating / revoking

Because state files contain session tokens, treat them like secrets: store them
outside version control, rotate when sessions expire, and delete them when no
longer needed. See `docs/security.md`.
