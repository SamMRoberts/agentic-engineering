# Assumption Killer

Assumption Killer is a cross-agent plugin for enforcing assumption discovery and verification before implementation work. It is designed for Codex, GitHub Copilot, Claude, and similar coding agents that can read instructions, create files, and run local validation scripts.

The plugin provides an Assumption Gate: a machine-checkable record of assumptions, risk, evidence, implementation decisions, and final verification.

## What It Provides

- A user-facing `assumption-killer` orchestrator agent.
- A reusable `assumption-killer` skill.
- JSON and Markdown templates for session artifacts.
- A JSON Schema for gate artifacts.
- A zero-dependency Node validator.
- Example lifecycle hooks for Codex and Copilot-style hosts.
- AGENTS and custom-instructions fragments for cross-agent setup.

## Why Skill Selection Is Not Enforcement

Skill selection only tells an agent what workflow to follow. It does not prove that the workflow happened. Enforcement requires deterministic artifacts and validation:

- `.agent/session/assumption-gate.json` records the gate in a script-checkable format.
- `.agent/session/assumptions.md` gives humans a readable summary.
- `bin/assumption-gate.mjs` fails when required fields, evidence, or blocking decisions are missing.

Hooks and CI can run the script, but they cannot guarantee that an agent selected this skill at the right time. Use repository instructions and hooks together.

## Recommended Setup

Install the plugin through the marketplace, or keep this directory at:

```text
plugins/assumption-killer/
```

Add the contents of `AGENTS.fragment.md` to your repository or global `AGENTS.md`. For tools that use custom instructions instead, use `custom-instructions.fragment.md`.

For workflows that support hooks, adapt the examples in `hooks/`.

## Manual Usage

From the target repository root, run the plugin script by path:

```bash
node plugins/assumption-killer/bin/assumption-gate.mjs init
node plugins/assumption-killer/bin/assumption-gate.mjs check
node plugins/assumption-killer/bin/assumption-gate.mjs summary
```

If installed as an npm-style package or exposed by a host, use:

```bash
assumption-gate init
assumption-gate check
assumption-gate summary
```

## Agent Workflow

1. Run `init`.
2. Fill in task, scope, and non-goals.
3. List assumptions before editing code.
4. Classify each assumption by category and risk.
5. Verify assumptions using repository evidence.
6. Update any disproven assumptions and adjust the implementation decision.
7. Do not implement while any high or critical assumption is unknown.
8. Run `check` before the final response.

## Hooks

The hook examples are intentionally generic because host support differs.

- `hooks/codex-hooks.example.json` shows prompt/session start initialization and completion-time checking.
- `hooks/copilot-hooks.example.json` shows the same lifecycle idea for Copilot-style sessions.

Hooks enforce the required artifacts. They do not force a model to select this skill, and they should not be treated as a substitute for repository instructions.

## CI Or Pre-Commit Enforcement

CI can fail if a required implementation change lacks a valid gate:

```bash
node plugins/assumption-killer/bin/assumption-gate.mjs check
```

Pre-commit hooks can run the same command when code files changed. Tune file matching to your repository so documentation-only changes are not blocked unnecessarily.

## Validation

From this plugin directory:

```bash
npm test
npm run validate
```

The validator uses only Node.js built-in modules.

## Troubleshooting

`ERROR: Missing .agent/session/assumption-gate.json`: run `init` from the repository root.

`ERROR: assumptions must contain at least one assumption`: add the assumptions that shaped implementation.

`ERROR: high or critical assumption is unknown`: verify it with repository evidence or stop and ask for clarification.

`ERROR: verified assumption has no evidence`: add concrete evidence such as file paths, command output summaries, schemas, or test names.

`ERROR: invalid JSON`: fix the JSON syntax before relying on the gate.
