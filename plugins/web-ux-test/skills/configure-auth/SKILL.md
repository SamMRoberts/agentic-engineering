---
name: configure-auth
description: "Use when a test plan requires authentication. Use for scaffolding .web-ux-testing/auth/ and capturing Playwright storage-state safely."
argument-hint: "<URL to authenticate against>"
user-invocable: false
---

# Configure auth

## Scope

Prepare `.web-ux-testing/auth/` with a gitignore and a `SETUP.md` note, then capture a storage-state file via `playwright codegen --save-storage`. The captured file is gitignored and the PreToolUse hook `deny-auth-credentials` rejects credential-shaped literals written to this directory.

## Procedure

1. Run `web-ux-test auth setup` to scaffold the directory and advance phase.
2. Capture a session interactively:
   ```bash
   npx playwright codegen --save-storage=.web-ux-testing/auth/user.json https://example.com/login
   ```
3. Verify the storage-state file exists and is **gitignored**: `git check-ignore .web-ux-testing/auth/user.json` must print a path.
4. Reference the file from the plan via `auth.storageStatePath`.

## Validation

```bash
node skills/configure-auth/scripts/check-gitignore.mjs
```

Exits 0 if `.web-ux-testing/auth/.gitignore` is present and ignores `*`; 1 otherwise.

## Safety

- Never commit `user.json` or any other capture artifact.
- Never paste tokens, JWTs, or passwords into plans, fixtures, or examples. The PreToolUse hook will reject these writes.
- Reference secrets via environment variables (e.g. `${SESSION_TOKEN}`) when interpolation is required.
