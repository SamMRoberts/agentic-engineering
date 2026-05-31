# agent-compat

`agent-compat` converts Copilot `*.agent.md` custom agents into instruction overlays that Codex and Claude can read.

Copilot supports user-selectable custom agents. Codex and Claude commonly rely on repository instructions instead. This plugin keeps agent plugins, skills, MCP tools, instruction files, CLI/TUI workflows, web pages, and MCP Apps more consistent across hosts by generating compact managed `AGENTS.md` and `custom-instructions.md` routing stubs from the same agent source files.

## Scope

In scope:

- Custom plugins
- Custom skills
- Custom MCP tools
- Custom `AGENTS.md` and `custom-instructions.md` files
- Custom CLI/TUI workflows
- Custom web pages and MCP Apps

Out of scope:

- Full desktop applications
- Backend APIs
- Native custom-agent picker support in Codex or Claude

## Install

```bash
cd plugins/agent-compat
npm install
```

## CLI

```bash
agent-compat scan [--root <path>] [--json]
agent-compat validate [--root <path>]
agent-compat generate [--root <path>] [--target codex|claude|all] [--out <dir>]
agent-compat install [--root <path>] [--target codex|claude|all] [--codex-file AGENTS.md] [--claude-file custom-instructions.md]
```

Defaults:

- `generate` writes `.agent-compat/codex/AGENTS.md` plus Codex references under `.agent-compat/codex/references/`.
- `generate` writes `.agent-compat/claude/custom-instructions.md` plus Claude references under `.agent-compat/claude/references/`.
- `install` updates managed sections in `AGENTS.md` and `custom-instructions.md`.

Managed sections use these markers:

```text
<!-- agent-compat:start -->
<!-- agent-compat:end -->
```

User-authored content outside those markers is preserved.

## Validation

`agent-compat validate` fails closed when:

- YAML frontmatter is invalid.
- Agent names are duplicated.
- A plugin entrypoint references missing private agents.
- A plugin agent references missing subagents in its `agents` frontmatter.
- A custom agent contains credential-shaped literals.

It also emits warnings for host-specific Copilot or VS Code fields that cannot be enforced directly in Codex or Claude, such as exact model labels, VS Code tool names, and handoff UI metadata.

## Generated behavior

Generated instructions tell Codex and Claude to:

- Prefer an explicit agent name from the user over trigger matching.
- Otherwise match the `description` trigger text or argument hint.
- Read only the matching reference file before acting.
- Preserve scope, constraints, safety rules, tool expectations, subagent delegation, handoffs, and body instructions in host-readable reference files.
- Treat unsupported host-specific fields as compatibility notes rather than executable guarantees.

Generated host instruction files are capped at 100 lines to avoid token bloat. Reference files are also capped at 100 lines. If a converted agent would exceed that limit, generation fails with the offending path and line count so the source agent can be split or shortened deliberately.

Reference paths are organized by source:

```text
.agent-compat/<host>/references/plugins/<plugin-name>/agents/<agent-name>.md
.agent-compat/<host>/references/standalone/<topic>/agents/<agent-name>.md
```

## Testing

```bash
cd plugins/agent-compat
npm test
```

From the repository root, verify marketplace drift:

```bash
node scripts/sync-marketplace.mjs --check
```
