# Vibe Sentinel

Vibe Sentinel is a cross-agent plugin that combines two implementation-time guardrails into one workflow:

- **Assumption gate** — make agents identify, classify, and verify assumptions with repository evidence before editing code.
- **Change-control contract** — compile vague requests into a contract with scope, allowed and forbidden areas, verification commands, risk, rollback, stop conditions, and drift detection.

Both gates were previously shipped as separate plugins (`assumption-killer`, `change-control-compiler`). Vibe Sentinel keeps their skills, scripts, schemas, templates, and CLI binaries — under one orchestrator agent, one install, and one version.

## What It Provides

- A user-facing `vibe-sentinel` orchestrator agent that routes implementation tasks through both gates.
- Two private stage agents (`assumption-killer`, `change-control-compiler`) you can invoke directly.
- Two reusable skills: `assumption-killer` and `change-control-compiler`.
- Two zero-dependency Node CLIs: `assumption-gate.mjs` and `change-control.mjs`.
- JSON Schemas, templates, and examples for both artifact contracts.
- Example lifecycle hooks for Codex- and Copilot-style hosts.
- A CI workflow example that runs both checks plus drift detection.
- `AGENTS.fragment.md` and `custom-instructions.fragment.md` for cross-agent setup.

## Required Artifacts

| File | Owner | Purpose |
| --- | --- | --- |
| `.agent/session/assumption-gate.json` | assumption-killer | Machine-checkable record of assumptions, risk, evidence, and final verification. |
| `.agent/session/assumptions.md` | assumption-killer | Human-readable summary of the assumption gate. |
| `.agent/session/change-control-contract.json` | change-control-compiler | Machine-checkable contract for scope, allowed/forbidden areas, verification, risk, and stop conditions. |
| `.agent/session/change-control-contract.md` | change-control-compiler | Human-readable summary of the contract. |

These filenames are unchanged from the previous plugins, so existing repositories using either gate continue to work after migration.

## Why Skill Selection Is Not Enforcement

Skill selection only tells an agent what workflow to follow. It does not prove the workflow happened. Vibe Sentinel enforces both gates with deterministic artifacts and validators:

- `bin/assumption-gate.mjs` fails when assumption fields, evidence, or blocking decisions are missing.
- `bin/change-control.mjs check` fails when the contract is incomplete or risk requirements are not met.
- `bin/change-control.mjs drift` compares modified files (via `git status --short`) against the contract's allowed and forbidden areas.

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
```

If installed as an npm-style package or exposed by a host, the bins are `assumption-gate` and `change-control`.

## Agent Workflow

1. Initialize both artifacts: `assumption-gate.mjs init` and `change-control.mjs init`.
2. Fill in the change-control contract: goal, non-goals, allowed and forbidden areas, verification commands, risk, stop conditions, and acceptance checklist.
3. List assumptions before editing code; verify high and critical assumptions with repository evidence.
4. Do not implement while any high or critical assumption is `unknown` or while the contract is invalid.
5. Implement only within `files_allowed_to_modify` or `allowed_change_areas`.
6. Before the final response, run `assumption-gate.mjs check`, `change-control.mjs check`, and `change-control.mjs drift`.

## Skills

Both skills are user-invocable so an agent can pick the right one for the task:

- `skills/assumption-killer/SKILL.md` — assumption discovery and verification workflow.
- `skills/change-control-compiler/SKILL.md` — contract compilation, scope, and drift workflow.

## Hooks

`hooks.json` registers both gates' lifecycle hooks. The example files under `hooks/` use repo-relative paths so they work whether or not the plugin is installed through a host.

## CI And Pre-Commit Enforcement

`ci/github-action.example.yml` shows a single job that runs both `check` commands and `drift`. Adapt it for your pipeline.

## Validation

From this plugin directory:

```bash
npm test
npm run validate
```

Both validators use only Node.js built-in modules.

## Migration From The Old Plugins

`plugins/assumption-killer/` and `plugins/change-control-compiler/` have been replaced by this plugin. See [CHANGELOG.md](CHANGELOG.md#migration-from-the-old-plugins) for the path replacements.
