# Changelog

## 1.0.0

- Initial release of Scope Guard, a scoped coding partner that enforces the lifecycle Scope -> Design -> Pseudocode -> Review -> Implement -> Update Docs.
- Adds a user-invocable `scope-guard` orchestrator agent and a `scope-guard` skill.
- Adds a zero-dependency Node CLI (`bin/scope-guard.mjs`) with `init`, `check`, and `summary` commands over a `.agent/session/scope-guard-plan.json` artifact.
- Enforces deterministic discipline gates: rejects vague goals, missing scope boundaries, components that bundle multiple responsibilities, empty pseudocode, implementation before approved pseudocode, missing tests, and stale documentation/diagrams.
- Ships a JSON Schema, JSON and Markdown templates, valid and invalid examples, Codex and Copilot hook examples, and a CI workflow example.
- Adds `AGENTS.fragment.md` and `custom-instructions.fragment.md` for cross-agent setup.
