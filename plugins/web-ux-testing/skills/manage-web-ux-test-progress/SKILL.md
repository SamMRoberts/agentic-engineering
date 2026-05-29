---
name: manage-web-ux-test-progress
description: 'Use when creating, updating, or resuming web UX test progress in web-ux-test/progress.md. Use for scenario queues, per-scenario statuses, evidence/artifact links, blockers, resume checkpoints, and interruption recovery. Do not use for running tests or analyzing findings.'
argument-hint: 'Progress file path, plan path, run mode, scenario IDs, status update, artifacts, blockers, or resume request.'
user-invocable: true
---

# Manage Web UX Test Progress

Maintain a durable `web-ux-test/progress.md` checkpoint so users can track scenario execution and resume interrupted test runs.

## Required inputs

- Progress file path, defaulting to `web-ux-test/progress.md`
- Plan path or test source path
- Run mode: `playwright-mcp`, `playwright-cli`, or `hybrid`
- Scenario queue or scenario ID
- Current status update or resume request
- Findings, evidence, artifacts, blockers, or required confirmations when available

## Procedure

1. Create `web-ux-test/progress.md` from `templates/web-ux-progress.template.md` when no progress file exists.
2. Initialize the scenario table before the first scenario runs.
3. Mark exactly one scenario `in_progress` before delegating that scenario to an executor sub-agent.
4. After the scenario returns, update its terminal or waiting status and record findings, evidence, artifacts, blockers, and next action.
5. On resume, skip terminal scenarios unless the user requests rerun, and identify the first scenario with `pending`, `blocked`, `needs_evidence`, or `needs_user_confirmation` status.
6. Preserve requirements-source gate answers, auth/session strategy, safety limits, and previous progress history.

## Status Rules

- `pending`: not started
- `in_progress`: currently delegated to one sub-agent session
- `passed`: completed without findings that block the scenario
- `failed`: completed with confirmed failure
- `blocked`: could not proceed because of safety, auth, data, environment, or app blocker
- `skipped`: intentionally not run
- `needs_evidence`: more evidence is required before analysis
- `needs_user_confirmation`: waiting for user decision

## Output

Return:

- progress file path
- updated scenario row
- overall counts by status
- next scenario to run or resume
- blockers and confirmations
- resume instructions
