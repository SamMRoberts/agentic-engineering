---
name: gremlin-explain-scenario
description: Explain why a specific UX Gremlin scenario matters in plain language for engineers, QA, or product stakeholders.
argument-hint: "Provide the scenario id and any route or customer-impact context that should shape the explanation"
user-invocable: true
---

# Explain Scenario

## Purpose

Use this skill to make a scenario understandable when the user needs rationale rather than execution.

## When to Use

- The user asks why a scenario matters or wants a plain-language explanation of a scenario id.
- You need to translate resilience jargon into product impact.

## When Not to Use

- The task is to author or validate the plan itself.
- No scenario id or comparable scenario context is available.

## Required Inputs

- Scenario id and the affected route or workflow.
- Optional customer, business, or accessibility impact context.

## Output Artifacts

- A scenario explanation in `.agent/session/ux-gremlin-scenario-explanations.md`.
- Plain-language rationale that can be reused in reports or reviews.

## CLI Entry Point

`node skills/gremlin-explain-scenario/scripts/explain-scenario.mjs`

## Workflow Notes

- Translate technical failure modes into user-visible consequences.
- Link back to the plan or report artifacts whenever possible.
