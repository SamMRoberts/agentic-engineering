---
name: change-control-compiler
description: Use before implementation, bug fixes, refactors, parser changes, Playwright changes, CI changes, dependency changes, or architecture changes to compile the user request into an enforceable Change Control Contract.
argument-hint: "Describe the change request to compile into a scope and verification contract"
user-invocable: true
---

# Change Control Compiler

## Purpose

Use this skill to compile a vague or broad software request into a concrete Change Control Contract before implementation. The contract controls scope, drift, verification, risk, and stop conditions.

## When to Use

Use before implementation, bug fixes, refactors, test rewrites, parser changes, Playwright flow changes, CI changes, release changes, dependency updates, or architecture changes.

## When Not to Use

Do not use for read-only explanation, trivial documentation typo fixes, or tasks where the user explicitly asks for no implementation.

## Required Artifacts

- `.agent/session/change-control-contract.json`
- `.agent/session/change-control-contract.md`

Initialize them with `node ./scripts/change-control.mjs init` (run from this skill's directory).

## Contract Fields

See `templates/change-control-contract.json` for the complete field list.

## Scope Classification

Classify what is in scope, what is out of scope, where edits are allowed, and which files or areas are forbidden. File modifications must stay inside `files_allowed_to_modify` or `allowed_change_areas`.

## Risk Levels

- `low`: small isolated change with clear tests.
- `medium`: multiple files or behavior changes, but bounded.
- `high`: architecture, parser, CI, release, auth, data, or public API impact.
- `critical`: security, data loss, production incident, migration, payment, permissions, or irreversible change.

High and critical contracts require a rollback plan, explicit forbidden areas, at least two verification commands, and a final acceptance checklist.

## Drift Detection Rules

Before completion, run `drift`. Any modified file outside allowed files or allowed areas is drift. Any modified file inside forbidden files or forbidden areas is blocking drift.

## Stop Conditions

Stop when implementation requires forbidden files, broader scope, undocumented behavior, new unapproved dependencies, destructive actions, production data access, missing verification, or unresolved high-risk open questions.

## Required Workflow

1. Initialize the contract artifacts.
2. Compile the user's request into goals, non-goals, allowed areas, forbidden areas, verification commands, risk, rollback, stop conditions, and acceptance checks.
3. Run `check`.
4. Implement only within the contract.
5. Run required tests and verification commands.
6. Run `drift` before final response.
7. If scope changes, update the contract before continuing.

For weak vs. strong contract examples, see `examples/contract.example.md`.

## Final Response Requirements

Report contract validation, drift status, verification commands run, files changed, and any stop conditions or open questions. If validation or drift fails, say implementation is blocked.

## Script Usage

Run these from this skill's directory so `./scripts/` resolves regardless of where the skill is installed:

```bash
node ./scripts/change-control.mjs init
node ./scripts/change-control.mjs check
node ./scripts/change-control.mjs summary
node ./scripts/change-control.mjs drift
```
