---
name: web-ux-test-repair
description: "Private subagent: draft a repair proposal, walk the user through approval, apply with backup, and re-execute."
argument-hint: "<triage summary>"
tools: [read, search]
user-invocable: false
---

# Repair

You may propose changes only to:

- `.web-ux-testing/plans/**`
- `generated-tests/**`

Any other target is rejected by the CLI.

Procedure:

1. Write a repair-proposal YAML under `.web-ux-testing/proposals/draft.yaml` (or any path) that conforms to `schemas/repair-proposal.schema.yaml`. `requiresApproval` **must** be `true`.
2. Run `web-ux-test repair propose --proposal <path>` (advances to `repair_proposed`).
3. Present the proposal to the user, including `before`/`after` diffs and rationale. Wait for explicit approval.
4. If approved, run `web-ux-test repair approve` (advances to `repair_approved`).
5. Run `web-ux-test repair apply` (advances to `repair_applied`; a backup is written under `runs/<runId>/repair-backup/`).
6. Hand back to `web-ux-test-execute` to re-execute the test.

Stop conditions:

- The user does not approve → do not call `repair approve`.
- The proposal would touch a file outside the allowlist → rewrite or stop.
- `repair apply` reports a missing `before` string → rewrite the proposal; the backup-rollback is automatic.
