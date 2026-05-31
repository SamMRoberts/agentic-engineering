# Authentication

`web-ux-test` uses Playwright's `storageState` for authenticated tests. This document explains the safe capture and reference flow.

## Why storage-state

Storage-state files capture the cookies and local-storage of an authenticated session so tests can resume that session without re-running login flows. The captured file lives at `.web-ux-testing/auth/user.json` by default and is **gitignored**.

## Capture flow

1. Scaffold the auth directory:
   ```bash
   web-ux-test auth setup
   ```
   This creates `.web-ux-testing/auth/` with a `.gitignore` that ignores everything except itself and `README.md`, plus a `SETUP.md` note.
2. Capture a session interactively via Playwright codegen:
   ```bash
   npx playwright codegen --save-storage=.web-ux-testing/auth/user.json https://example.com/login
   ```
3. Sign in in the launched browser; close the browser when done. Codegen writes `user.json`.

## Reference from a plan

```yaml
auth:
  required: true
  mode: storageState
  storageStatePath: .web-ux-testing/auth/user.json
```

The generator emits `test.use({ storageState: "..." })` so the spawned Playwright run picks up the session.

## Safety

- **Never commit** `user.json` or any other capture artifact. The default `.gitignore` ignores everything in the directory; verify with `git check-ignore`.
- **Never embed credentials as literals** in plans, fixtures, or examples. The `deny-auth-credentials` PreToolUse hook actively rejects writes to `.web-ux-testing/auth/` that contain credential-shaped strings (JWTs, GitHub PATs, OpenAI keys, AWS access keys, Slack tokens, password literals, Bearer headers).
- **Reference secrets via environment variables** when interpolation is required, e.g. `${SESSION_TOKEN}`. The hook ignores env-var references.
- **Rotate** any storage-state file that has been accidentally committed or shared.

## Failure modes

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| 401/403 in run output, classifier returns `auth_failure` | Session expired or wrong account | Recapture `user.json`. |
| Hook denies the write | Credential-shaped literal in payload | Use env-var reference; do not embed real tokens. |
| `git status` shows `user.json` | Auth gitignore missing or modified | Re-run `web-ux-test auth setup`; verify with `git check-ignore`. |
