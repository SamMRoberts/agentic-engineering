# Changelog

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
- Replace `node plugins/change-control-compiler/bin/change-control.mjs` (or `node plugins/change-control-compiler/skills/change-control-compiler/scripts/change-control.mjs`) with `node plugins/vibe-sentinel/bin/change-control.mjs`.
- Update AGENTS or custom instruction fragments to point at `plugins/vibe-sentinel/AGENTS.fragment.md` or `plugins/vibe-sentinel/custom-instructions.fragment.md`.
- Update hook configurations to use `plugins/vibe-sentinel/hooks/codex-hooks.example.json` or `plugins/vibe-sentinel/hooks/copilot-hooks.example.json`.
- Update CI to use `plugins/vibe-sentinel/ci/github-action.example.yml`.
