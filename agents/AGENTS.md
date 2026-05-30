# Custom Agent Authoring Guide

Scope: this file applies to anything created or modified under `agents/`. Read it alongside [../instructions/agentic-tooling/repo/AGENTS.md](../instructions/agentic-tooling/repo/AGENTS.md), which owns the broader principles (primitive choice, frontmatter rules, orchestrator pattern, MCP, validation, safety). This file is the concrete how-to for assembling a standalone custom agent in this repo.

## What lives in `agents/`

- `agents/<topic>/<agent-name>.agent.md` — standalone, user-invocable custom agents that are **not** packaged inside a plugin.
- One topic folder per coherent area (e.g. `chat-customizations-evaluations/`). One agent file per role.

If a new agent is part of a plugin workflow (orchestrator or private subagent), it belongs under `plugins/<plugin>/agents/`, not here. See [../plugins/AGENTS.md](../plugins/AGENTS.md).

## When a standalone agent is the right primitive

Use `agents/` only when **all** of these apply:

- The agent represents a reusable persona or workflow the user invokes directly from the chat agent picker.
- It does not depend on plugin-specific skills, schemas, hooks, or MCP servers.
- It does not need stage-based delegation to private subagents (no orchestrator pattern needed).
- The workflow is general-purpose enough to live outside any single plugin.

If any of those fail, prefer a plugin folder. If the request is a single parameterized task, prefer a prompt file. If it's always-on behavior, prefer an instructions file. See the primitive-selection table in the parent instructions.

## File layout

```
agents/
├── AGENTS.md                                # This guide
└── <topic>/
    ├── <agent-name>.agent.md                # Required
    └── skills/                              # Optional, only if this agent owns skills
        └── <skill-name>/SKILL.md
```

- Filename must be `<agent-name>.agent.md` and `<agent-name>` must equal the `name` field in the frontmatter.
- One agent per file. Do not bundle multiple personas.
- Skills are optional. Add a `skills/` sibling only if the agent owns step-by-step procedures that benefit from being loaded on demand; otherwise inline the procedure in the agent body.

## Required frontmatter

```yaml
---
name: kebab-case-name
description: "Use when: <triggers>. Use for: <use cases>."
model: "<exact model id>"            # Optional; only set when the workflow needs a specific model
tools: [read, search, edit, todo]    # Minimum useful set
argument-hint: "What the user should describe when invoking this agent"
user-invocable: true                  # Standalone agents must be invocable
---
```

Rules:

- `name` matches the filename (without `.agent.md`) and the folder convention (`kebab-case`).
- `description` is the discovery surface. Lead with `Use when:` plus trigger keywords. Keep it specific and quote it when it contains colons.
- `tools` is the **minimum** useful set. Adding `execute` or `edit` requires the role to actually need shell or file writes — explain why in the body if it's surprising.
- `model` is omitted unless the workflow specifically needs a model larger or smaller than the user's default.
- `user-invocable: true` is the whole point of putting an agent in `agents/`.

## Body sections

Required sections in this order:

1. **Role statement** — one or two sentences naming the persona and what it produces.
2. **Scope** — what the agent applies to (file types, situations, related tools).
3. **Core Rules** — non-negotiable behaviors. Read-before-write, run-tool-X-when-Y, preserve-user-intent, validate-after-edit.
4. **Constraints** — what the agent will not do. Credentials, tool broadening, ambiguous prose, duplicate workflows.
5. **Approach** — numbered procedure. Identify → inspect → diagnose → draft → apply → validate → report. Keep it under ~8 steps.
6. **Output Format** — exactly what the agent reports back. Files changed, validation run, remaining risks.

Optional sections: `## Related Skills` (when the agent owns or invokes specific skills), `## Examples` (concrete invocation prompts).

Reference shape: [chat-customizations-evaluations/customization-evaluation-optimizer.agent.md](chat-customizations-evaluations/customization-evaluation-optimizer.agent.md).

## Tool selection

Pick the smallest set that covers the role:

| Role | Typical tools |
| --- | --- |
| Read-only reviewer / analyzer | `[read, search]` |
| Editor of customization files | `[read, search, edit, todo]` |
| Editor + validator runner | `[read, search, edit, execute, todo]` |
| Orchestrator (only if you have private subagents) | `[read, search, todo, agent]` |

Add specialized tools (`fix-customization-evaluation-diagnostics`, `run_vscode_command`, MCP server tools) only when the agent's procedure explicitly invokes them. Never add a tool "just in case."

## Discovery: writing the `description`

The `description` is the only way the chat host decides whether to pick this agent. Treat it like search SEO:

- Start with `Use when:` followed by 5–10 specific trigger phrases the user is likely to type.
- Name the file types, diagnostics, or workflows the agent handles.
- Avoid vague claims (`helpful`, `general-purpose`). Avoid duplicating other agents' triggers.
- Keep it one paragraph, ≤ 600 chars. Long descriptions get truncated in picker UIs.

## Safety rules every standalone agent must honor

- Never embed credentials, tokens, private keys, session cookies, tenant IDs, or production secrets in examples, fixtures, prompts, or instructions.
- Never broaden tool access, file scope, model selection, or mutation permissions mid-task without naming the change in the final summary.
- Ask one concise clarification question when missing scope affects safety, destructive actions, external services, or expected output. Do not invent the answer.
- Stop when a required tool, skill, or input is unavailable. Report the blocker; do not fall back silently.

## Pre-merge checklist

Before opening a PR that adds or modifies a standalone agent:

1. Filename, folder, `name` frontmatter, and any references all use the same kebab-case id.
2. YAML frontmatter is valid (quoted values where needed, no tabs).
3. `description` includes specific trigger keywords and a `Use when:` clause.
4. `tools` is the minimum set for the documented procedure. Each tool is actually invoked by the procedure.
5. Body contains the required sections (Role, Scope, Core Rules, Constraints, Approach, Output Format).
6. If the agent invokes the Chat Customizations Evaluations extension, run those diagnostics against the new file and resolve any reported issues.
7. Smoke-test the agent by invoking it on one realistic prompt; confirm it stops on missing inputs rather than guessing.
8. If the agent references skills under `agents/<topic>/skills/`, those skills exist and `SKILL.md` files match the rules in [../plugins/AGENTS.md](../plugins/AGENTS.md) (200-line cap, schema-backed validators when applicable).

## Common mistakes

- Putting plugin-internal agents under `agents/`. Private subagents belong in their plugin folder.
- Vague descriptions ("a helpful agent that can do many things"). The chat host will never pick it.
- Adding `edit` or `execute` to a read-only reviewer agent "for flexibility." It only adds risk.
- Setting a specific `model` without a workflow reason. Defer to the user's default unless the role actually requires Opus, Sonnet, or a specific provider.
- Marking the agent `user-invocable: false`. That defeats the point of `agents/`; if it's not user-facing, move it into a plugin as a private subagent.
- Writing prose procedures longer than the role needs. Keep the Approach section tight; expand into a sibling skill only when the procedure is genuinely repeatable across invocations.
- Duplicating an existing agent's scope. Extend the existing agent or sharpen both descriptions to make routing unambiguous.
