# Vibe Sentinel

Vibe Sentinel is a cross-agent plugin that combines three implementation-time guardrails into one workflow:

- **Assumption gate** — make agents identify, classify, and verify assumptions with repository evidence before editing code.
- **Change-control contract** — compile vague requests into a contract with scope, allowed and forbidden areas, verification commands, risk, rollback, stop conditions, and drift detection.
- **Scope Guard plan** — enforce Scope -> Design -> Pseudocode -> Review -> Implement -> Update Docs with a deterministic plan artifact.

The assumption and change-control gates were previously shipped as separate plugins (`assumption-killer`, `change-control-compiler`). Vibe Sentinel keeps those skills and now bundles Scope Guard as a third stage — each with its own scripts, schemas, templates, and CLI binary under one orchestrator agent, one install, and one version.

## What It Provides

- A user-facing `vibe-sentinel` orchestrator agent that routes implementation tasks through all required gates.
- Three private stage agents: `assumption-killer`, `change-control-compiler`, and `scope-guard`.
- Three reusable skills: `assumption-killer`, `change-control-compiler`, and `scope-guard`.
- Three zero-dependency Node CLIs: `assumption-gate.mjs`, `change-control.mjs`, and `scope-guard.mjs`.
- JSON Schemas, templates, and examples for all three artifact contracts.
- Example lifecycle hooks for Codex- and Copilot-style hosts.
- A CI workflow example that runs all checks plus drift detection.
- `AGENTS.fragment.md` and `custom-instructions.fragment.md` for cross-agent setup.

## Required Artifacts

| File | Owner | Purpose |
| --- | --- | --- |
| `.agent/session/assumption-gate.json` | assumption-killer | Machine-checkable record of assumptions, risk, evidence, and final verification. |
| `.agent/session/assumptions.md` | assumption-killer | Human-readable summary of the assumption gate. |
| `.agent/session/change-control-contract.json` | change-control-compiler | Machine-checkable contract for scope, allowed/forbidden areas, verification, risk, and stop conditions. |
| `.agent/session/change-control-contract.md` | change-control-compiler | Human-readable summary of the contract. |
| `.agent/session/scope-guard-plan.json` | scope-guard | Machine-checkable task state for scope, design, pseudocode review, implementation, tests, risks, and docs. |
| `.agent/session/scope-guard-plan.md` | scope-guard | Human-readable companion structured by lifecycle phase. |

The assumption and change-control filenames are unchanged from the previous plugins, so existing repositories using either gate continue to work after migration. Scope Guard uses the same artifact names as the standalone `plugins/scope-guard` plugin.

## Why Skill Selection Is Not Enforcement

Skill selection only tells an agent what workflow to follow. It does not prove the workflow happened. Vibe Sentinel enforces all three gates with deterministic artifacts and validators:

- `bin/assumption-gate.mjs` fails when assumption fields, evidence, or blocking decisions are missing.
- `bin/change-control.mjs check` fails when the contract is incomplete or risk requirements are not met.
- `bin/change-control.mjs drift` compares modified files (via `git status --short`) against the contract's allowed and forbidden areas.
- `bin/scope-guard.mjs check` fails when the plan is incomplete, pseudocode is not approved before implementation, tests are missing, or documentation/diagram deltas are stale.

Hooks and CI can run these scripts, but they cannot guarantee an agent selected the right skill at the right time. Use repository instructions and hooks together.

## Recommended Setup

Install through the marketplace, or keep this directory at:

```text
plugins/vibe-sentinel/
```

Add `AGENTS.fragment.md` to your repository `AGENTS.md` (or use `custom-instructions.fragment.md` for tools that take custom instructions).

For hosts that support hooks, adapt `hooks/codex-hooks.example.json` or `hooks/copilot-hooks.example.json`.

## Manual Usage

From the target repository root:

```bash
# Assumption gate
node plugins/vibe-sentinel/bin/assumption-gate.mjs init
node plugins/vibe-sentinel/bin/assumption-gate.mjs check
node plugins/vibe-sentinel/bin/assumption-gate.mjs summary

# Change-control contract
node plugins/vibe-sentinel/bin/change-control.mjs init
node plugins/vibe-sentinel/bin/change-control.mjs check
node plugins/vibe-sentinel/bin/change-control.mjs summary
node plugins/vibe-sentinel/bin/change-control.mjs drift

# Scope Guard plan
node plugins/vibe-sentinel/bin/scope-guard.mjs init
node plugins/vibe-sentinel/bin/scope-guard.mjs check
node plugins/vibe-sentinel/bin/scope-guard.mjs summary
```

If installed as an npm-style package or exposed by a host, the bins are `assumption-gate`, `change-control`, and `scope-guard`.

## Agent Workflow

1. Initialize the artifacts: `assumption-gate.mjs init`, `change-control.mjs init`, and `scope-guard.mjs init`.
2. Fill in the change-control contract: goal, non-goals, allowed and forbidden areas, verification commands, risk, stop conditions, and acceptance checklist.
3. List assumptions before editing code; verify high and critical assumptions with repository evidence.
4. Do not implement while any high or critical assumption is `unknown` or while the contract is invalid.
5. For medium, high, or critical implementation tasks; architecture changes; parser changes; CI changes; dependency changes; API changes; and multi-file behavior changes, fill and approve the Scope Guard plan before implementation.
6. Implement only within `files_allowed_to_modify` or `allowed_change_areas` and within the approved Scope Guard plan when required.
7. Before the final response, run `assumption-gate.mjs check`, `change-control.mjs check`, `change-control.mjs drift`, and `scope-guard.mjs check` when Scope Guard was required.

For trivial documentation typo fixes and read-only explanation tasks, Scope Guard is not required unless the user explicitly requests the full lifecycle.

## Skills

The bundled skills are user-invocable so an agent can pick the right one for the task:

- `skills/assumption-killer/SKILL.md` — assumption discovery and verification workflow.
- `skills/change-control-compiler/SKILL.md` — contract compilation, scope, and drift workflow.
- `skills/scope-guard/SKILL.md` — scoped design, pseudocode review, test, and documentation workflow.

## Hooks

`hooks.json` registers lifecycle hooks for all three gates. The example files under `hooks/` use repo-relative paths so they work whether or not the plugin is installed through a host. Change-control remains the only drift hook; Scope Guard validates its plan on stop.

## CI And Pre-Commit Enforcement

`ci/github-action.example.yml` shows a single job that runs all `check` commands plus change-control `drift`. Adapt it for your pipeline.

## Validation

From this plugin directory:

```bash
npm test
npm run validate
```

All validators use only Node.js built-in modules.

## Migration From The Old Plugins

`plugins/assumption-killer/` and `plugins/change-control-compiler/` have been replaced by this plugin. See [CHANGELOG.md](CHANGELOG.md#migration-from-the-old-plugins) for the path replacements.

`plugins/scope-guard/` remains available as a standalone plugin. Vibe Sentinel now bundles the same Scope Guard capability as a third stage for teams that want assumption verification, drift control, and pseudocode-first design discipline in one install.
