# Change Control Compiler

Change Control Compiler turns vague software change requests into concrete, enforceable Change Control Contracts before implementation begins.

It is a scope and drift control plugin for Codex, GitHub Copilot, Claude, and similar coding agents. It is not just a planner: the contract defines what the agent may change, what it must avoid, what it must verify, and when it must stop.

## Why It Exists

Coding agents often make incorrect assumptions about scope. A small bug fix can become a broad refactor, or a parser tweak can drift into unrelated architecture. This plugin makes scope explicit before edits start and checks modified files against the allowed contract.

## Why Skill Selection Alone Is Not Enforcement

Selecting a skill only influences behavior. Enforcement requires artifacts and deterministic checks:

- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`
- `skills/change-control-compiler/scripts/change-control.mjs check`
- `skills/change-control-compiler/scripts/change-control.mjs drift`

Hooks, CI, and pre-commit checks can run the validator. They still cannot force a model to choose this skill, so pair hooks with repository instructions.

## Recommended Setup

Install the plugin through the marketplace or keep it at:

```text
plugins/change-control-compiler/
```

Paste `AGENTS.fragment.md` into repository or global `AGENTS.md`. For tools that use custom instructions, use `custom-instructions.fragment.md`.

## Manual Usage

From the target repository root:

```bash
node plugins/change-control-compiler/skills/change-control-compiler/scripts/change-control.mjs init
node plugins/change-control-compiler/skills/change-control-compiler/scripts/change-control.mjs check
node plugins/change-control-compiler/skills/change-control-compiler/scripts/change-control.mjs summary
node plugins/change-control-compiler/skills/change-control-compiler/scripts/change-control.mjs drift
```

From this plugin directory, use the short bin wrapper:

```bash
node bin/change-control.mjs check --contract skills/change-control-compiler/examples/valid-contract.json
```

## Codex-Style Workflows

Use the `change-control-compiler` agent or skill before implementation. Initialize the contract, fill it with scope and verification details, validate it, implement only within allowed areas, and run `check` plus `drift` before the final response.

The example hook file at `hooks/codex-hooks.example.json` shows one possible lifecycle: initialize near session start, check before completion, and run drift checks after file edits or before stop. Treat it as example syntax, not a universal Codex hook contract.

## Copilot-Style Workflows

Add `custom-instructions.fragment.md` or `AGENTS.fragment.md` to the repository instructions Copilot reads. The example hook at `hooks/copilot-hooks.example.json` shows initialization on session start and validation at session end where lifecycle hooks are available.

## Claude-Style Workflows

Add the custom instructions fragment to Claude project instructions or install this plugin where supported. Claude should create and validate the same `.agent/session/` artifacts before editing code.

## Hooks

Hooks enforce required artifacts and drift checks. They do not force skill selection, and host event names vary. Keep hook examples labeled as examples and adapt them to the host version you use.

## CI And Pre-Commit

The optional workflow in `ci/github-action.example.yml` runs:

```bash
node skills/change-control-compiler/scripts/change-control.mjs check
node skills/change-control-compiler/scripts/change-control.mjs drift
```

CI and pre-commit checks are stronger enforcement layers than skill selection because they can block merges or commits when contracts are invalid or drift is detected.

## Drift Detection

The `drift` command reads `git status --short`. Every modified path must match `files_allowed_to_modify` or `allowed_change_areas` by exact path or path prefix. The command fails if any modified path matches `files_forbidden_to_modify` or `forbidden_change_areas`.

## Example Workflow

```bash
node skills/change-control-compiler/scripts/change-control.mjs init
# Agent fills .agent/session/change-control-contract.json and .agent/session/change-control-contract.md
node skills/change-control-compiler/scripts/change-control.mjs check
# Implement only inside allowed areas
node skills/change-control-compiler/scripts/change-control.mjs drift
node skills/change-control-compiler/scripts/change-control.mjs summary
```

## Troubleshooting

`ERROR: Missing .agent/session/change-control-contract.json`: run `init` from the target repository root.

`ERROR: goal is empty or vague`: rewrite the goal so it is specific, observable, and testable.

`ERROR: high risk contracts require at least two verification commands`: add a second meaningful command.

`ERROR: drift: modified file is outside allowed areas`: update the contract before editing that path, or revert the out-of-scope change.

`ERROR: drift: modified file matches forbidden area`: stop and revise scope with the user.
