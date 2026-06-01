# Changelog

## 1.1.0

- Add driveable CLI commands so sessions no longer require hand-editing JSON: `start`, `set`, `record`, and `status`.
- Add `menu` command backed by a machine-readable safe task menu (`data/safe-task-menu.json`) so engineers can discover safe starter workflows.
- Add `complete` and `history` commands plus an append-only adoption ledger (`.agent/session/onramp-history.jsonl`) and its schema, giving teams visibility into adoption progress.
- Keep the session JSON as the single source of truth and regenerate the markdown mirror automatically.
- Add tests for the new commands and a menu/schema sync check.
- Update documentation, the AGENTS fragment, and plugin metadata.

## 1.0.0

- Add the initial Agent On-Ramp Coach plugin.
- Add confidence-level and risk-classification workflow guidance.
- Add adoption-session templates, schema, examples, and deterministic validation.
- Add git snapshot and no-edit enforcement helpers.
- Add cross-agent instruction fragments, hook examples, CI sample, and tests.
