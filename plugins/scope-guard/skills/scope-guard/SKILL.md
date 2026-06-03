---
name: scope-guard
description: Use before implementation, bug fixes, refactors, feature additions, or API changes to enforce Scope -> Design -> Pseudocode -> Review -> Implement -> Update Docs with a deterministic plan artifact.
argument-hint: "Describe the coding task to scope, design, pseudocode-review, and document"
user-invocable: true
---

# Scope Guard

## Purpose

Use this skill to keep a coding task disciplined before and during implementation. It enforces a structured lifecycle and records the plan in a machine-checkable artifact so the discipline can be validated, not just promised.

Lifecycle: **Scope -> Design -> Pseudocode -> Review -> Implement -> Update Docs.**

## When to Use

Use before implementation, bug fixes, refactors, feature additions, parser changes, API changes, or workflow changes.

## When Not to Use

Do not use for read-only explanation or trivial documentation typo fixes, unless the user explicitly asks for the full workflow.

## Required Artifacts

- `.agent/session/scope-guard-plan.json`
- `.agent/session/scope-guard-plan.md`

Initialize them with `node ./scripts/scope-guard.mjs init` (run from this skill's directory).

## Plan Fields

The plan (`CodingTaskState`) must define `version`, `taskId`, `userGoal`, `scope`, `design`, `pseudocode`, `implementation`, and `docs`.

- `scope`: `inScope`, `outOfScope`, `assumptions`, `openQuestions`.
- `design`: `components` (each with `name`, `responsibility`, `dependencies`, `extensionPoints`), `extensionPoints`, `rejectedAlternatives`.
- `pseudocode`: `draft`, `reviewFindings`, `approved`.
- `implementation`: `changedFiles`, `testsAddedOrUpdated`, `knownRisks`.
- `docs`: `designDocUpdated`, `diagramsUpdated`, `docChanges`.

## Phase 1 - Scope Intake

Clarify the goal before designing. Ask focused scoping questions when requirements are ambiguous, for example:

- What problem should this solve, and who or what uses it?
- What input does it receive and what output should it produce?
- What should happen on failure?
- What existing files, APIs, services, or constraints matter?
- What is explicitly out of scope?

For small tasks, compress this into three constraints: where the logic lives, the inputs/outputs, and whether backward compatibility is required.

## Phase 2 - Scope Boundary

Fill `scope.inScope` and `scope.outOfScope` to prevent accidental feature expansion. Record `scope.assumptions` and `scope.openQuestions`.

## Phase 3 - Single-purpose Design

Give each component one job. Avoid a single component that validates, persists, retries, formats errors, and emits metrics. Prefer separate validator, repository, coordinator, error-mapper, and metrics components. Record `design.extensionPoints` and `design.rejectedAlternatives`. Prefer boring defaults: do not build a framework for two checks.

## Phase 4 - Pseudocode Plan

Write implementation-level `pseudocode.draft` before code.

## Phase 5 - Pseudocode Review Gate

Review the pseudocode against correctness (success/failure/edge cases), scope (nothing unrelated crept in), design (single-purpose, clear dependencies, extensible), and implementation risk (migration, backward compatibility, test gaps). Record `pseudocode.reviewFindings`, revise the draft if issues are found, then set `pseudocode.approved`.

## Phase 6 - Implementation

Implement only after the review passes. Do not introduce new behavior unless the agreed scope requires it. Record `implementation.changedFiles`, `implementation.testsAddedOrUpdated`, and `implementation.knownRisks`. Produce or update tests matching the same scope.

## Phase 7 - Documentation and Diagrams

After implementation, update the design doc and diagrams. Record `docs.docChanges` (the doc delta) and set `docs.designDocUpdated` and `docs.diagramsUpdated`. Prefer Mermaid diagrams unless another format is requested.

## Scope Creep Detection

Flag and route expansion instead of absorbing it:

- Unrelated features -> future work.
- Unnecessary public API or schema changes -> explicit approval and migration plan.
- Rewriting working components -> require justification.
- New dependency -> require a rationale.
- Skipping tests -> implementation is incomplete.
- Skipping docs after design changes -> block final completion.

Ask whether the new behavior should be a separate task.

## Enforced Gates

`node ./scripts/scope-guard.mjs check` fails when:

- `userGoal` is empty or vague.
- `scope.inScope` or `scope.outOfScope` is empty.
- `design.components` is empty or a component bundles multiple responsibilities.
- `pseudocode.draft` is empty.
- Implementation has changed files but pseudocode is not approved.
- Implementation has changed files but no tests were added or updated.
- Implementation has changed files but docs/diagrams are not updated.

## Required Workflow

1. Initialize the plan artifacts.
2. Clarify scope and fill in/out of scope.
3. Propose single-purpose components and extension points.
4. Write pseudocode.
5. Review the pseudocode and set `approved`.
6. Implement within the approved scope and add tests.
7. Record the documentation and diagram delta.
8. Run `check` before the final response. If scope changes, update the plan and call out the change.

## Final Response Requirements

Report plan validation, scope boundaries, components, pseudocode approval, files changed, tests, documentation delta, and any scope creep or open questions. If validation fails, say implementation is blocked.

## Script Usage

Run these from this skill's directory so `./scripts/` resolves regardless of where the skill is installed:

```bash
node ./scripts/scope-guard.mjs init
node ./scripts/scope-guard.mjs check
node ./scripts/scope-guard.mjs summary
```

## Cross-Agent Notes

Codex: use this skill before edits and run `check` before the final response.

GitHub Copilot: paste `AGENTS.fragment.md` into repository instructions or adapt the example hook.

Claude: paste `custom-instructions.fragment.md` into project instructions or install this plugin where supported.

Hooks and CI validate the plan artifact. They do not force skill selection.
