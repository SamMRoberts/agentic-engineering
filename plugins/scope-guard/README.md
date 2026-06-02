# Scope Guard

Scope Guard is a cross-agent plugin that keeps a coding agent disciplined before and during implementation. It enforces one structured lifecycle:

**Scope -> Design -> Pseudocode -> Review -> Implement -> Update Docs.**

The risky part of agent-assisted coding is not code generation — it is the agent skipping discipline: expanding scope, bundling unrelated concerns, writing code before a reviewed plan, and leaving documentation stale. Scope Guard records the plan in a machine-checkable artifact and validates the discipline with a deterministic CLI.

## What It Provides

- A user-facing `scope-guard` orchestrator agent that drives the full lifecycle.
- A reusable `scope-guard` skill that owns the procedure.
- A zero-dependency Node CLI (`bin/scope-guard.mjs`) with `init`, `check`, and `summary`.
- A JSON Schema, JSON and Markdown templates, and valid/invalid examples for the plan artifact.
- Example lifecycle hooks for Codex- and Copilot-style hosts.
- A CI workflow example that runs the plan check.
- `AGENTS.fragment.md` and `custom-instructions.fragment.md` for cross-agent setup.

## Required Artifacts

| File | Purpose |
| --- | --- |
| `.agent/session/scope-guard-plan.json` | Machine-checkable task state: scope, design, pseudocode, review, implementation, and docs. |
| `.agent/session/scope-guard-plan.md` | Human-readable companion structured by lifecycle phase. |

Initialize them with `node plugins/scope-guard/bin/scope-guard.mjs init`.

## The Plan Artifact

The plan models the blueprint's `CodingTaskState`:

- `scope` — `inScope`, `outOfScope`, `assumptions`, `openQuestions`.
- `design` — `components` (each with `name`, `responsibility`, `dependencies`, `extensionPoints`), `extensionPoints`, `rejectedAlternatives`.
- `pseudocode` — `draft`, `reviewFindings`, `approved`.
- `implementation` — `changedFiles`, `testsAddedOrUpdated`, `knownRisks`.
- `docs` — `designDocUpdated`, `diagramsUpdated`, `docChanges`.

## Why Skill Selection Is Not Enforcement

Selecting a skill only tells the agent which workflow to follow; it does not prove the workflow happened. Scope Guard enforces the lifecycle with a deterministic validator. `node plugins/scope-guard/bin/scope-guard.mjs check` fails when:

- `userGoal` is empty or vague.
- `scope.inScope` or `scope.outOfScope` is empty.
- `design.components` is empty, or a component bundles multiple responsibilities (e.g. "validates, persists, retries, formats errors, and emits metrics").
- `pseudocode.draft` is empty.
- Implementation has changed files but the pseudocode is not approved (review gate).
- Implementation has changed files but no tests were added or updated.
- Implementation has changed files but the design doc, diagrams, or doc delta are missing.

Hooks and CI can run this script, but they cannot guarantee an agent selected the right skill at the right time. Use repository instructions and hooks together.

## Recommended Setup

Install through the marketplace, or keep this directory at:

```text
plugins/scope-guard/
```

Add `AGENTS.fragment.md` to your repository `AGENTS.md` (or use `custom-instructions.fragment.md` for tools that take custom instructions).

For hosts that support hooks, adapt `hooks/codex-hooks.example.json` or `hooks/copilot-hooks.example.json`.

## Manual Usage

From the target repository root:

```bash
# Initialize the plan artifacts
node plugins/scope-guard/bin/scope-guard.mjs init

# Validate the plan and lifecycle gates
node plugins/scope-guard/bin/scope-guard.mjs check

# Print a human-readable summary
node plugins/scope-guard/bin/scope-guard.mjs summary
```

The CLI accepts `--root <path>` to point at a target repository and `--plan <path>` to validate a specific plan file. It exits `0` on success, `1` on validation errors, and `2` on bad usage.

## Scope Creep Detection

When a requested change expands the task, the agent stops and routes it:

- Unrelated features -> future work.
- Unnecessary public API or schema changes -> explicit approval and migration plan.
- Rewriting working components -> require justification.
- New dependency -> require a rationale.
- Skipping tests -> implementation is incomplete.
- Skipping docs after design changes -> block final completion.

## Development

```bash
cd plugins/scope-guard
npm test
```

The test suite spawns the CLI against the bundled examples and temporary workspaces to verify the discipline gates.
