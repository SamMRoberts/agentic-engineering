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

The contract must define `task`, `goal`, `problem_statement`, `success_criteria`, `scope`, `non_goals`, `allowed_change_areas`, `forbidden_change_areas`, `files_to_inspect`, `files_allowed_to_modify`, `files_forbidden_to_modify`, `expected_behavior`, `current_behavior`, `test_requirements`, `verification_commands`, `risk_level`, `rollback_plan`, `stop_conditions`, `open_questions`, `implementation_plan`, and `final_acceptance_checklist`.

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

## Weak Contracts

- Goal: "Improve parser behavior."
- Non-goals: empty.
- Allowed areas: "repo".
- Verification: "run tests."

Weak contracts are vague, unbounded, and hard to enforce.

## Strong Contracts

- Goal: "Fix TypeScript symbol signature extraction so control-flow nodes are not emitted as symbols and declaration signatures are bounded to their declaration node range."
- Non-goals: "Do not redesign indexing. Do not change unrelated parser languages."
- Allowed areas: `backend/src/indexing/typescript_parser.rs`, `backend/tests/fixtures/typescript/`.
- Verification: `cargo test parser_signature_bounds`, `cargo test indexing`.

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

## Cross-Agent Notes

Codex: use this skill before edits and run `check` plus `drift` before final response.

GitHub Copilot: paste `AGENTS.fragment.md` into repository instructions or adapt the example hook.

Claude: paste `custom-instructions.fragment.md` into project instructions or install this plugin where supported.

Hooks and CI validate artifacts and drift. They do not force skill selection.
