# Change Control Contract

## Task
Create the Agent On-Ramp Coach plugin.

## Problem Statement
Engineering teams need a reusable plugin that defaults to read-only agent workflows, makes agent work inspectable, gates edits behind explicit confidence levels and approvals, and produces deterministic session artifacts rather than relying on agent self-reporting.

## Goal
Add a production-usable `agent-on-ramp-coach` plugin with skill instructions, templates, schema, deterministic Node validation script, examples, hook samples, CI sample, manifests, docs, and tests.

## Success Criteria
- New plugin lives under `plugins/agent-on-ramp-coach`.
- Skill defines read-only defaults, confidence levels, risk rules, approval gates, file and command rules, review summaries, anti-patterns, and cross-agent guidance.
- Session templates, examples, and schema match the requested adoption-session structure.
- `onramp.mjs` uses only Node built-in modules and implements `init`, `check`, `summary`, `snapshot`, and `no-edits`.
- Valid example passes validation and invalid example fails validation.
- Snapshot and no-edit checks pass and fail in the expected cases.
- README, fragments, hook examples, and CI sample are copy-ready.
- Package tests, plugin validation, and marketplace sync checks pass.

## Scope
Bounded creation of a new plugin package for safe AI agent adoption workflows.

### In Scope
- New files under `plugins/agent-on-ramp-coach`.
- Generated marketplace metadata for the new plugin.
- Local `.agent/session` change-control and assumption-gate artifacts.

### Out of Scope
- Changing existing plugin behavior.
- Adding external dependencies.
- Creating a backend service, MCP server, MCP app, or desktop app.
- Installing the plugin into a personal marketplace.
- Changing global or repo instructions outside requested fragment files.

## Non-goals
- Do not make autonomous coding the default.
- Do not create vague placeholder docs or examples.
- Do not add runtime dependencies.
- Do not hard-code credentials, local absolute paths, tenant IDs, or production secrets.
- Do not modify existing plugin packages except generated marketplace output if required by repo conventions.

## Allowed Change Areas
- `.agent`
- `plugins/agent-on-ramp-coach`
- `plugins/marketplace.json`

## Forbidden Change Areas
- Existing plugin directories.
- `instructions`
- `agents`

## Files to Inspect
- `AGENTS.md`
- `plugins/AGENTS.md`
- Existing plugin manifests and package files.
- `scripts/sync-marketplace.mjs`
- Plugin Creator skill and validator.

## Current Behavior
No `agent-on-ramp-coach` plugin exists in this repository.

## Expected Behavior
The plugin provides a safe Agent On-Ramp workflow with read-only defaults, confidence levels, risk classification, explicit edit approvals, deterministic adoption-session checks, git snapshot/no-edit enforcement, copy-ready docs, and validation examples.

## Test Requirements
- Validate the plugin manifest with the plugin-creator validator.
- Run the valid adoption-session example through `onramp.mjs check`.
- Run the invalid adoption-session example and confirm `check` fails.
- Run `snapshot` and `no-edits` in a git repository and confirm `no-edits` passes with no out-of-session changes.
- Simulate a file change outside `.agent/session` for a read-only level and confirm `no-edits` fails.
- Run `npm test` from the new plugin package.
- Run repository marketplace sync check.

## Verification Commands
- `npm test` from `plugins/agent-on-ramp-coach`
- `node skills/agent-on-ramp-coach/scripts/onramp.mjs check --session skills/agent-on-ramp-coach/examples/valid-adoption-session.json`
- `node skills/agent-on-ramp-coach/scripts/onramp.mjs check --session skills/agent-on-ramp-coach/examples/invalid-adoption-session.json`
- `node skills/agent-on-ramp-coach/scripts/onramp.mjs snapshot`
- `node skills/agent-on-ramp-coach/scripts/onramp.mjs no-edits`
- `python3 /Users/samroberts/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/agent-on-ramp-coach`
- `node scripts/sync-marketplace.mjs --check`
- `node plugins/assumption-killer/bin/assumption-gate.mjs check`
- `node plugins/change-control-compiler/bin/change-control.mjs check`
- `node plugins/change-control-compiler/bin/change-control.mjs drift`

## Risk Level
Medium.

## Rollback Plan
Remove `plugins/agent-on-ramp-coach`, restore generated `plugins/marketplace.json` if changed, and restore local `.agent/session` gate artifacts if needed.

## Stop Conditions
- A new runtime dependency becomes necessary.
- Repo manifest or plugin validation contracts cannot be satisfied without changing existing infrastructure.
- No-edit enforcement cannot be made deterministic using git state.
- Validation requires modifying existing plugins or repository instructions outside allowed scope.
- A generated example or schema fails validation and cannot be fixed within scope.

## Open Questions
None.

## Implementation Plan
- Scaffold the plugin directory using the Plugin Creator flow where applicable.
- Add repo-compatible manifests, package metadata, changelog, license, and orchestrator agent.
- Implement the skill, templates, schema, examples, hook samples, CI sample, and documentation fragments.
- Implement `onramp.mjs` with built-in Node modules and deterministic validation/no-edit checks.
- Add `node:test` coverage for valid, invalid, init, snapshot, no-edits pass, and no-edits fail behavior.
- Run validation and marketplace sync checks.

## Final Acceptance Checklist
- Plugin content is copy-ready and avoids hype, placeholders, and autonomous defaults.
- Skill body stays under the repository line-count guidance.
- Script has clear errors and no external dependencies.
- Read-only sessions fail when files outside `.agent/session` change after a snapshot.
- Docs explain hooks as enforcement aids, not universal skill-selection mechanisms.
- Required validation commands are run or any unrun command is clearly reported.
