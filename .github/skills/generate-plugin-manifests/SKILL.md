---
name: generate-plugin-manifests
description: "Use when scaffolding plugin manifests for the three supported hosts (Copilot, Codex, Claude Code). Use for: missing plugin.json files, new plugin folders, plugin manifest scaffolding, host manifest stubs, .codex-plugin/plugin.json, .claude-plugin/plugin.json. Generates only the files that do not yet exist; never overwrites."
argument-hint: "Plugin name (kebab-case) or path to the plugin folder. Optional when the user is already inside a plugin directory."
user-invocable: true
---

# Generate Plugin Manifests

Creates the three plugin manifests that the [plugin structure validator](../scripts/validate-plugin-structure.mjs) and the [marketplace sync](../../scripts/sync-marketplace.mjs) expect for any plugin under `plugins/`:

- `plugin.json` — Copilot / Codex CLI runtime (`entrypointAgent`, `agents`, `skills`, optional `privateAgents`).
- `.codex-plugin/plugin.json` — Codex marketplace metadata (`name`, `version`, `description`, `interface.*`).
- `.claude-plugin/plugin.json` — Claude Code pointers (`agents`, `skills`, `hooks`, `mcpServers`).

Only writes manifests that do not already exist. Never overwrites a manifest already on disk. Stub manifests contain `TODO:` markers and a `version` of `0.1.0`.

## When to use

- A new plugin folder was just created under `plugins/<plugin-name>/` and is missing one or more manifests.
- An existing plugin has only some manifests (e.g. has `plugin.json` but not `.claude-plugin/plugin.json`) and the structure validator is flagging the gap.
- A contributor is following [../../plugins/AGENTS.md](../../plugins/AGENTS.md) "Required directory shape" and needs the manifest skeleton.

Do not use this skill to update existing manifests; edit those directly.

## Required inputs

- **Plugin name (kebab-case)** or **path to the plugin folder under `plugins/`**.

Resolve the plugin in this order:

1. If the user passed a name or path in the request, use it directly.
2. Otherwise, infer it from the current working directory: if `pwd` resolves inside `plugins/<name>/`, use `<name>`.
3. Otherwise, ask the user which plugin to target. Do not guess.

Reject the input and stop when:

- The name is not kebab-case (`^[a-z][a-z0-9-]*[a-z0-9]$`).
- The folder does not exist under `plugins/`. Tell the user to create the folder first.
- The resolved path is outside `plugins/`.

## Procedure

1. Resolve the plugin name and folder per the rules above. Ask for clarification only if the inputs are missing or ambiguous.
2. Run the generator from the repo root:

   ```bash
   node .github/scripts/generate-plugin-manifests.mjs <plugin-name>
   ```

3. Read the script's output. It reports which files were created (`+`) and which were skipped because they already existed (`=`).
4. Run the structure validator to confirm the plugin is in a valid state:

   ```bash
   node .github/scripts/validate-plugin-structure.mjs
   ```

5. Summarise what changed: list the created files using workspace-relative paths, note the TODOs the user must replace, and link to [../../plugins/AGENTS.md](../../plugins/AGENTS.md) for the broader plugin shape.

## Output requirements

Report back to the user:

- The plugin folder targeted.
- Files created (workspace-relative paths) and files skipped because they already existed.
- A short follow-up checklist:
  - Replace `description`, `longDescription`, `keywords`, `category`, and `capabilities` placeholders.
  - Add the entrypoint agent file under `agents/<plugin-name>.agent.md`.
  - Run `node .github/scripts/validate-plugin-structure.mjs` and `node scripts/sync-marketplace.mjs --check`.

## Safety rules

- Never overwrite an existing manifest. The script enforces this; if a host changes its manifest format later, edit the affected file by hand instead of regenerating.
- Never embed credentials, tokens, internal hostnames, or tenant IDs in the stubs. The defaults intentionally include only the repo URL and `Sam Roberts` as author.
- Do not run this skill outside `plugins/`. The script refuses paths outside `plugins/` to avoid accidental writes elsewhere in the repo.

## Resources

- [../scripts/generate-plugin-manifests.mjs](../scripts/generate-plugin-manifests.mjs) — the generator the skill invokes.
- [../scripts/validate-plugin-structure.mjs](../scripts/validate-plugin-structure.mjs) — strict validator used to confirm the result.
- [../../plugins/AGENTS.md](../../plugins/AGENTS.md) — full plugin authoring guide.
