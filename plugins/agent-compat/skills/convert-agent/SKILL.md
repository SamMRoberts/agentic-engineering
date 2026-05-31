---
name: convert-agent
description: "Use when converting Copilot *.agent.md custom agents into Codex AGENTS.md or Claude custom-instructions.md overlays with deterministic validation and managed install markers."
argument-hint: "<repository root or plugin path>"
user-invocable: false
---

# Convert Copilot Custom Agents

## Scope

Use this skill when a workflow needs to scan, validate, generate, or install compatibility instructions for Copilot `*.agent.md` custom agents.

Stop if the requested work is for a full desktop application or backend API rather than agent/plugin/instruction tooling.

## Required Inputs

- Repository root or plugin root.
- Target host: `codex`, `claude`, or `all`.
- Whether to generate preview files or install managed sections into existing instruction files.

Ask for clarification only when installation target files or mutation scope are unclear.

## Procedure

1. Inspect the root for `agents/**/*.agent.md` and `plugins/*/agents/*.agent.md`.
2. Run `agent-compat validate --root <path>`.
3. If validation fails, report errors and stop.
4. For preview output, run `agent-compat generate --root <path> --target <target>`.
5. For installation, run `agent-compat install --root <path> --target <target>`.
6. Confirm generated host stubs and reference files are each 100 lines or fewer.
7. Review generated warnings about unsupported Copilot-only or VS Code-only fields.
8. Report generated files, updated files, validation commands, and residual host limitations.

## Output

- Generated Codex stub: `.agent-compat/codex/AGENTS.md`.
- Generated Claude stub: `.agent-compat/claude/custom-instructions.md`.
- Generated references: `.agent-compat/<host>/references/**`.
- Optional installed sections in `AGENTS.md` and/or `custom-instructions.md`.

## Safety

- Never include credential-shaped literals in generated outputs.
- Keep generated host stubs and reference files at 100 lines or fewer.
- Read one generated reference file at a time only when the user prompt matches it.
- Preserve content outside `<!-- agent-compat:start -->` and `<!-- agent-compat:end -->`.
- Treat duplicate names, missing referenced agents, invalid frontmatter, and credential-like content as blocking errors.
