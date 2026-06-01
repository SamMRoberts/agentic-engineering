---
name: assumption-killer
description: Use before implementation, bug fixes, refactors, parser changes, Playwright changes, CI changes, or architecture changes to identify, verify, and record assumptions before editing code.
argument-hint: "Describe the implementation task whose assumptions must be gated"
user-invocable: true
---

# Assumption Killer

## Purpose

Use this skill to prevent implementation based on confident but unverified assumptions. It creates an Assumption Gate that records what the agent believes, how each belief was checked, and whether implementation is allowed.

## When to Use

Use before modifying production code, tests, config, parser logic, Playwright flows, build scripts, CI, release logic, schemas, data models, API contracts, security rules, permissions, or architecture.

## When Not to Use

Do not use for pure read-only explanation, tiny formatting edits, typo fixes in documentation, or tasks where the user explicitly asks only for analysis and no implementation.

## Required Artifacts

Create or update these files before implementation:

- `.agent/session/assumption-gate.json`
- `.agent/session/assumptions.md`

Initialize them with:

```bash
node plugins/assumption-killer/bin/assumption-gate.mjs init
```

## Assumption Categories

Use only these categories: `repo_structure`, `existing_behavior`, `test_behavior`, `runtime_behavior`, `tooling_behavior`, `parser_behavior`, `ux_behavior`, `data_model`, `api_contract`, `security_or_permissions`, `backwards_compatibility`, `deployment_or_ci`.

## Risk Levels

- `low`: Wrong assumption causes minor rework or local confusion.
- `medium`: Wrong assumption can break a narrow workflow or test.
- `high`: Wrong assumption can produce incorrect implementation, regressions, or unsafe behavior.
- `critical`: Wrong assumption can cause data loss, security exposure, destructive action, production impact, or broad architectural damage.

## Required Workflow

1. State the task, scope, and non-goals.
2. Identify assumptions before editing files.
3. Classify each assumption by category and risk level.
4. Verify assumptions with repository evidence: file reads, tests, command output, schemas, or documented contracts.
5. Record evidence in `.agent/session/assumption-gate.json` and summarize it in `.agent/session/assumptions.md`.
6. Stop before implementation if any `high` or `critical` assumption has status `unknown`.
7. If any assumption is `disproven`, update the plan before implementation.
8. Before the final response, run `node plugins/assumption-killer/bin/assumption-gate.mjs check`.

## Good Assumptions

- "The frontend test runner is Vitest because `frontend/package.json` defines `test: vitest run`."
- "The parser captures function calls through `pattern.call_expression` because `backend/src/indexing/parser.rs` maps that capture name."
- "The API response must preserve `symbolId` because `frontend/src/api/types.ts` exports it and current tests assert it."

## Weak Assumptions

- "This probably uses React."
- "The existing tests should cover it."
- "The button selector should be stable."
- "This config is only used locally."

Weak assumptions are not evidence. Replace them with checked files, commands, or contracts.

## Evidence Standards

Evidence must be concrete and reproducible. Prefer exact file paths, command names, schema paths, test names, or API contracts. Do not cite memory, intuition, naming guesses, or old run results as verified evidence unless you also checked current repository state.

Each verified assumption must include non-empty `evidence`, and should include `files_checked` or `commands_run` when applicable.

## Blocking Rules

- Do not implement while any `high` or `critical` assumption is `unknown`.
- Do not proceed from a `disproven` assumption without updating the implementation decision.
- Do not mark an assumption `verified` without evidence.
- Do not skip the final `check` command.

## Final Response Requirements

Report whether the Assumption Gate passed. Mention any remaining medium or low unknowns as open risk. If the check failed, state that implementation is blocked and name the blocking assumptions.

## Script Usage

```bash
node plugins/assumption-killer/bin/assumption-gate.mjs init
node plugins/assumption-killer/bin/assumption-gate.mjs check
node plugins/assumption-killer/bin/assumption-gate.mjs summary
```

Run from the target repository root so artifacts are created under `.agent/session/`.

## Cross-Agent Notes

Codex: use this skill before edits and run `check` before the final response.

GitHub Copilot: paste `AGENTS.fragment.md` into repository instructions or wire the example hook where supported.

Claude: paste `custom-instructions.fragment.md` into custom instructions or install this plugin where supported.

Hooks can enforce artifact validity, but they cannot force the agent to choose this skill. Keep the instructions and hooks together.
