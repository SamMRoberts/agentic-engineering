---
name: gremlin-triage-failures
description: Classify failing UX Gremlin scenarios as likely product bugs, flaky tests, or environment issues.
argument-hint: "Provide the failing scenario ids, evidence, and any run metadata or logs"
user-invocable: true
---

# Triage Failures

## Purpose

Use this skill to turn raw failing scenarios into prioritized follow-up actions.

## When to Use

- A run produced failures that need classification and priority.
- The user asks why something failed or whether a failure is flaky.

## When Not to Use

- No results or evidence exist yet.
- The task is to author the initial plan.

## Required Inputs

- Scenario ids, failure evidence, and run metadata.
- Context about environment instability or known flaky dependencies.

## Output Artifacts

- A triage summary in `.agent/session/ux-gremlin-triage.md`.
- Suggested priority labels for follow-up remediation.

## CLI Entry Point

`node skills/gremlin-triage-failures/scripts/triage-failures.mjs`

## Workflow Notes

- Separate product defects from test harness problems.
- Use `fix-suggestions` once a failure is confirmed as a likely application bug.
