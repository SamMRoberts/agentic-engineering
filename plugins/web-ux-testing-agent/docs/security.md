# Security

Security practices for the **web-ux-testing-agent** plugin.

## Secrets never live in plans or specs

- Plans reference credentials and other secrets via `${ENV_VAR}` indirection
  only. The validator (`lib/plan-validator.mjs`) actively **rejects literal
  secret values** and flags secret-like keys (`password`, `token`, etc.) unless
  the value is an `${ENV}` reference or the key ends in `_env` / `_path`.
- The generator (`lib/test-generator.mjs`) emits `${VAR}` as
  `process.env.VAR ?? ""` (or template literals for embedded refs), so secrets
  are **never written into generated spec files**.

## Git-ignored sensitive files

The plugin `.gitignore` excludes:

- `.auth/`, `storage-state*.json` — auth/session tokens.
- `test-results/`, `reports/`, `playwright-report/` — run artifacts that may
  contain sensitive screenshots or traces.
- `node_modules/`, `dist/`.

Never force-add these. Treat storage-state files like passwords.

## MCP server hardening

- **Path traversal guard:** `mcp/src/context.ts` `safeResolve()` rejects any
  path that escapes the configured workspace root.
- **Read vs. write separation:** read-only tools (`list_plans`, `get_plan`,
  `validate_plan`, `list_reports`, `get_report`, `debug_failure`) cannot mutate
  state. Mutating tools are gated:
  - `save_plan` requires `confirmedWrite: true`.
  - `run_plan` requires `confirmedRun: true`.
- The server only operates within `WEB_UX_WORKSPACE` / `WEB_UX_PLANS_DIR` /
  `WEB_UX_REPORTS_DIR`.

## Artifacts and reports

- Reports link artifacts by **relative path**; do not paste secret-bearing
  request/response bodies into Markdown reports.
- Review traces/screenshots before sharing — they can capture on-screen secrets.

## Destructive actions

Plans must opt in to destructive actions via
`environment.destructive_actions_allowed: true`, and should include `cleanup`
steps. Agents must stop on production-risky or destructive requests that are not
explicitly authorized.

## Dependency hygiene

The runner, MCP, and UI packages pin dependency ranges in their `package.json`.
Run `npm audit` periodically and keep Playwright current.
