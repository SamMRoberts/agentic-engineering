# Changelog

## 2.0.0

- **Breaking:** renames `plugins/vibe-sentinel/bin/` to `scripts/`. Update any hook configurations, CI workflows, custom-instruction fragments, or repository scripts that reference `plugins/vibe-sentinel/bin/<name>.mjs` to use `scripts/<name>.mjs`.
- Updates the bundled `hooks.json`, `hooks/codex-hooks.example.json`, `hooks/copilot-hooks.example.json`, `ci/github-action.example.yml`, `AGENTS.fragment.md`, `custom-instructions.fragment.md`, `README.md`, `agents/scope-guard.agent.md`, `package.json`, and `plugin.json` to the new path.
- Updates skill examples and test fixtures (`skills/assumption-killer/examples/*`, `skills/change-control-compiler/examples/*`, `test/fixtures/valid-workspace/.agent/session/*`) to reference the new path.
- Updates the hooks test to assert canonical commands resolve under `scripts/`.

## 1.1.0

- Adds Scope Guard as a third Vibe Sentinel workflow stage alongside `assumption-killer` and `change-control-compiler`.
- Adds the `scope-guard` skill, private stage agent, CLI binary, schema, templates, examples, tests, hooks, and CI check under `plugins/vibe-sentinel/`.
- Updates the `vibe-sentinel` orchestrator to require Scope Guard for medium/high/critical implementation tasks, architecture changes, parser changes, CI changes, dependency changes, API changes, and multi-file behavior changes.
- Keeps Scope Guard as a separate plan artifact instead of merging it into the change-control contract.
- Keeps change-control responsible for git drift detection and Scope Guard responsible for design, pseudocode review, tests, and documentation/diagram deltas.

## 1.0.0

- Initial release of Vibe Sentinel, combining the former `assumption-killer` and `change-control-compiler` plugins into one.
- Adds a single user-invocable `vibe-sentinel` orchestrator agent that routes implementation tasks through both guardrails.
- Keeps the `assumption-killer` and `change-control-compiler` skills under their existing names so existing instructions and SKILL references continue to work.
- Keeps both CLI binaries: `node plugins/vibe-sentinel/bin/assumption-gate.mjs` and `node plugins/vibe-sentinel/bin/change-control.mjs`.
- Keeps the `.agent/session/assumption-gate.json`, `.agent/session/assumptions.md`, `.agent/session/change-control-contract.json`, and `.agent/session/change-control-contract.md` artifact contracts unchanged.
- Combines hooks for both gates into one `hooks.json` (init on session start, drift on post-tool-use, check + drift on stop).
- Combines CI workflow into a single Vibe Sentinel job that runs both checks and drift.

### Migration from the old plugins

`plugins/assumption-killer/` and `plugins/change-control-compiler/` have been removed. Update any references:

- Replace `node plugins/assumption-killer/bin/assumption-gate.mjs` with `node plugins/vibe-sentinel/bin/assumption-gate.mjs`.
- Replace `node plugins/change-control-compiler/bin/change-control.mjs` (or `node plugins/change-control-compiler/skills/change-control-compilescripts/change-control.mjs`) with `node plugins/vibe-sentinel/bin/change-control.mjs`.
- Update AGENTS or custom instruction fragments to point at `plugins/vibe-sentinel/AGENTS.fragment.md` or `plugins/vibe-sentinel/custom-instructions.fragment.md`.
- Update hook configurations to use `plugins/vibe-sentinel/hooks/codex-hooks.example.json` or `plugins/vibe-sentinel/hooks/copilot-hooks.example.json`.
- Update CI to use `plugins/vibe-sentinel/ci/github-action.example.yml`.
