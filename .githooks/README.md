# Repo-managed Git hooks

These hooks are versioned with the repository so every contributor gets the same checks.

## Enable

```bash
git config core.hooksPath .githooks
```

Run that once per clone. Disable with:

```bash
git config --unset core.hooksPath
```

## Hooks

- `pre-commit` — runs `node scripts/sync-marketplace.mjs --check` when the staged change touches `plugins/` or `scripts/sync-marketplace.mjs`. Fails the commit if `plugins/marketplace.json` is out of date.
