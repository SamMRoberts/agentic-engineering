# Troubleshooting

Common issues and how to resolve them.

## Playwright is not installed

```
ERROR: Playwright is not installed. Run `npm --prefix runner install` first,
then `npx playwright install chromium`.
```

Install the runner dependencies and browsers:

```bash
cd runner && npm install && npx playwright install chromium
```

## A plan fails validation

Run the validator for a detailed message:

```bash
npm run validate:plan path/to/plan.yaml
```

Common causes: missing `id`/`title`/`environment`/`steps`, a non-kebab-case
`id`, an unknown `action`, or a literal secret value (use `${ENV_VAR}` instead).

## A step times out waiting for a locator

This is usually a **timing issue** or **selector drift**:

1. Run `failure-triage` to classify:
   `node skills/failure-triage/scripts/analyze-failure.mjs reports/<run>/report.json`
2. If selector drift, use the **debugger** with Playwright MCP to inspect the
   live page and confirm the real accessible name/role.
3. Apply a minimal repair, re-validate, and re-run.

## Authentication fails mid-run

- Verify the storage state: `node skills/auth-state/scripts/verify-storage-state.mjs .auth/<file>.json`.
- If invalid, re-capture it (`docs/auth.md`).
- Confirm `WEB_UX_STORAGE_STATE` points at the right file.

## MCP App does not render

Your host may not support MCP Apps. Use the local UI fallback:

```bash
cd ui && npm install && npm run dev   # http://localhost:5273
```

See `docs/mcp-app.md` for host support details.

## MCP server will not start

- Ensure `tsx` is available (`npx -y tsx ...` is used in `.mcp.json`).
- Check `WEB_UX_WORKSPACE`, `WEB_UX_PLANS_DIR`, `WEB_UX_REPORTS_DIR`.
- A path-traversal error means a requested path escaped the workspace root —
  use a path inside the configured workspace.

## Tests

Run the core test suite from the plugin root:

```bash
npm test    # node --test test/**/*.test.mjs
```

Per-package checks:

```bash
npm run build:runner   # tsc --noEmit in runner/
npm run build:mcp      # tsc --noEmit in mcp/
npm run build:ui       # tsc + vite build in ui/
```
