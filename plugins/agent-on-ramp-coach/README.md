# Agent On-Ramp Coach

Agent On-Ramp Coach helps software engineers adopt AI coding agents through safe confidence levels, read-only workflows, approval gates, and reviewable session summaries.

It is designed for engineers and teams who want agent assistance but do not want broad, hard-to-review autonomy. The default mode is read-only because trust is easier to build when the agent first proves it can explain, inspect, and summarize accurately without changing the repository.

## What It Provides

- A user-invocable `agent-on-ramp-coach` workflow.
- Confidence levels from explanation-only to bounded implementation.
- A safe task menu for daily engineering work.
- Required session artifacts under `.agent/session/`.
- Deterministic validation, summary, git snapshot, and no-edit checks.
- Copy-ready instructions for Codex, Copilot, Claude, and similar agents.
- Hook and CI examples for teams that want stronger enforcement.

## Confidence Levels

| Level | Default use |
| --- | --- |
| `level_0_explain_only` | Explain code, concepts, errors, tests, or workflows. |
| `level_1_analyze_only` | Inspect files, logs, diffs, test output, and repo structure. |
| `level_2_plan_only` | Create a plan, risk assessment, test strategy, or implementation outline. |
| `level_3_propose_patch` | Propose a patch but do not apply it without approval. |
| `level_4_make_small_scoped_change` | Make approved edits inside a small scope and verify them. |
| `level_5_agent_executes_bounded_task` | Complete a bounded task with tests and verification. |

Agents should recommend the lowest useful level for the request.

## Safe Starter Workflows

Use the safe task menu in `skills/agent-on-ramp-coach/templates/safe-task-menu.md` for:

- Code explanation and file summaries.
- PR and diff summaries.
- Risk discovery and change-impact mapping.
- Test suggestions and test-failure explanations.
- Debug plans.
- Handoff notes and documentation plans.
- Small refactor plans.
- Review of prior agent output.

These workflows are useful even when no code is changed.

## Manual Usage

From the target repository root, drive the whole session with composable commands instead of editing JSON by hand:

```bash
# Discover a safe starting workflow
node skills/agent-on-ramp-coach/scripts/onramp.mjs menu

# Start and populate a session in one step
node skills/agent-on-ramp-coach/scripts/onramp.mjs start \
  --task "Explain how retries work" \
  --workflow explain_code \
  --risk low \
  --selected-level level_1_analyze_only

# Record evidence incrementally as you work (repeatable flags)
node skills/agent-on-ramp-coach/scripts/onramp.mjs record \
  --inspected src/retry-service.ts \
  --command "rg retry src" \
  --finding "Retries are bounded by maxAttempts"

# Update scalar fields and see what is still missing
node skills/agent-on-ramp-coach/scripts/onramp.mjs set --status read_only_complete
node skills/agent-on-ramp-coach/scripts/onramp.mjs status

# Validate, then record the session in the team adoption log
node skills/agent-on-ramp-coach/scripts/onramp.mjs check
node skills/agent-on-ramp-coach/scripts/onramp.mjs complete
```

The session JSON is the single source of truth; `start`, `set`, and `record` regenerate the markdown mirror automatically. The lower-level commands are still available:

```bash
node skills/agent-on-ramp-coach/scripts/onramp.mjs init
node skills/agent-on-ramp-coach/scripts/onramp.mjs snapshot
node skills/agent-on-ramp-coach/scripts/onramp.mjs no-edits
node skills/agent-on-ramp-coach/scripts/onramp.mjs summary
```

When running from this plugin package, use the full path:

```bash
node skills/agent-on-ramp-coach/scripts/onramp.mjs check --session skills/agent-on-ramp-coach/examples/valid-adoption-session.json
```

## Commands

| Command | Purpose |
| --- | --- |
| `init` | Create empty session artifacts. |
| `start` | Create and populate a session in one step from flags. |
| `set` | Update scalar fields (workflow, risk, levels, status, approval, next step). |
| `record` | Append evidence to list fields (files, commands, findings, etc.). |
| `status` | Show the session plus a readiness checklist for the selected level. |
| `menu` | List safe starter workflows (`--json` for machine-readable output). |
| `check` | Validate the session and the git boundary when a snapshot exists. |
| `no-edits` | Fail if read-only levels changed files outside `.agent/session/`. |
| `snapshot` | Record current git state for no-edit checks. |
| `summary` | Print a scan-friendly session summary. |
| `complete` | Validate, then append the session to the adoption history log. |
| `history` | Summarize the adoption history log for a team. |

## Session Artifacts

The workflow creates:

```text
.agent/session/onramp-session.json
.agent/session/onramp-session.md
.agent/session/onramp-git-snapshot.json
.agent/session/onramp-history.jsonl
```

The JSON artifact records task, request, workflow type, risk level, recommended and selected confidence levels, explicit edit approval, allowed and forbidden actions, files inspected, commands run, files modified, findings, recommendations, human review items, verification commands, final status, and next suggested step.

## Adoption History

`complete` validates the session and then appends one JSON line to `.agent/session/onramp-history.jsonl` recording the timestamp, task title, workflow type, risk level, recommended and selected confidence levels, final status, and inspected/modified file counts. Each entry matches `schemas/adoption-history-entry.schema.json`.

`history` summarizes the log: total sessions and breakdowns by selected confidence level, workflow type, and final status. Teams can use this append-only ledger to see real adoption, build trust with evidence, and decide when engineers are ready to graduate to a higher confidence level. The log is commit-friendly so adoption progress can be reviewed in a PR.

## No-Edit Checks

Run `snapshot` before meaningful work. It records the current branch, current commit, timestamp, and `git status --short`.

Run `no-edits` before the final response for levels 0 through 3. It compares current git status with the snapshot and fails if files outside `.agent/session/` changed. This is deterministic enough for local workflow enforcement and does not rely on agent self-reporting.

## Codex-Style Workflows

Use the `agent-on-ramp-coach` skill or agent before meaningful work. Start read-only, create the session artifacts, classify risk, recommend the lowest useful confidence level, and ask before edits.

Paste `AGENTS.fragment.md` into repository instructions when you want this behavior to be always available. The hook example in `hooks/codex-hooks.example.json` shows possible session initialization, snapshot, check, and no-edit enforcement points.

## Copilot-Style Workflows

Use `custom-instructions.fragment.md` or adapt `AGENTS.fragment.md` for the repository instructions Copilot reads. The hook example in `hooks/copilot-hooks.example.json` is illustrative only. Host hook names and payloads vary, so test the wiring in your environment.

## Claude-Style Workflows

Use the custom instructions fragment as Claude project guidance or install the plugin where Claude-compatible plugin manifests are supported. Claude should create and validate the same `.agent/session/` artifacts before and after work.

## Hooks

Hooks can initialize artifacts, snapshot git state, run checks, and enforce no-edit boundaries. Hooks do not force skill selection. Pair hook examples with repository instructions so the agent knows when and why to use the workflow.

## Example Individual Workflow

1. User asks: "Explain why this test fails, but do not change files."
2. Agent selects `level_1_analyze_only`.
3. Agent initializes the session and snapshots git state.
4. Agent states which failure output and files it will inspect.
5. Agent records inspected files, commands, findings, and review items.
6. Agent runs `check` and `no-edits`.
7. Agent returns a short summary and recommended next step.

## Example Team Rollout

Use `skills/agent-on-ramp-coach/templates/team-rollout-plan.md`:

- Week 1: read-only explanation and repo orientation.
- Week 2: test suggestions and debugging plans.
- Week 3: PR/diff review assistance.
- Week 4: small patch proposals.
- Week 5+: bounded implementation with verification.

## Validation

From this plugin directory:

```bash
npm test
npm run validate
node skills/agent-on-ramp-coach/scripts/onramp.mjs check --session skills/agent-on-ramp-coach/examples/invalid-adoption-session.json
```

The invalid example should fail. A failure there means the validator is blocking malformed or unsafe sessions as intended.

## Troubleshooting

`ERROR: missing .agent/session/onramp-session.json`: run `init` from the target repository root.

`ERROR: allowed_actions must contain at least one action`: record what the agent may do before continuing.

`ERROR: forbidden_actions must contain at least one action`: record the boundaries before continuing.

`ERROR: files_modified must be empty when the selected confidence level does not allow edits`: lower-confidence workflows cannot change files outside `.agent/session/`.

`ERROR: missing .agent/session/onramp-git-snapshot.json`: run `snapshot` before `no-edits`.

`ERROR: read-only level changed file outside .agent/session`: review the changed path, restore it or explicitly move to a higher approved confidence level, then update the session artifact.
