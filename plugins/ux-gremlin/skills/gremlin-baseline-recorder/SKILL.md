---
name: gremlin-baseline-recorder
description: Guide the user step-by-step to define or record the happy-path baseline flow that gremlins will mutate.
argument-hint: "Describe the normal user journey, the expected success state, and any auth or safety boundaries"
user-invocable: true
---

# Baseline Recorder

## Purpose

Use this skill to capture the exact happy-path flow before any hostile mutations are introduced.

## When to Use

- The user says “walk me through it”, “record the baseline”, or only knows the happy path verbally.
- You need a shared source of truth before generating plan scenarios.

## When Not to Use

- A trustworthy baseline flow is already documented in the plan.
- The task is about reporting or triaging completed runs.

## Required Inputs

- Entry route or starting URL.
- Ordered user actions for the happy path.
- Expected end state, safety limits, and required test data.

## Output Artifacts

- A captured baseline narrative in `.agent/session/ux-gremlin-baseline.md`.
- Inputs ready for `plan-gremlins` and later Playwright generation.

## CLI Entry Point

`node skills/gremlin-baseline-recorder/scripts/baseline-recorder.mjs`

## Workflow Notes

- Keep the baseline free of mutations and recovery behavior.
- Escalate to `plan-gremlins` once the steps and expected result are stable.
