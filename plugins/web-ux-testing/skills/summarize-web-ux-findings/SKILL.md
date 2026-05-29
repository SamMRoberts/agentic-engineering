---
name: summarize-web-ux-findings
description: 'Use when summarizing web UX exploratory testing findings into a severity-ordered report with evidence, confirmed-versus-hypothesis separation, next steps, and Playwright CLI regression-test recommendations. Use for web-ux-test/results.yaml, pasted finding lists, or evidence bundles. Do not use for browser execution or test generation.'
argument-hint: 'Provide a findings file, pasted findings, scenario IDs, or an evidence bundle to summarize.'
user-invocable: true
---

# Summarize Web UX Findings

Turn structured web UX findings into a concise, severity-ordered report that preserves evidence and identifies follow-up work.

## Required inputs

- Findings file path, defaulting to `web-ux-test/results.yaml`, or pasted findings content
- Scenario IDs or priority areas when the summary should be scoped
- Evidence bundle when findings are not already schema-shaped
- Target audience when known: engineering triage, product review, accessibility review, or regression planning

If findings cannot be parsed, report the parse problem and ask for corrected findings before summarizing. If evidence is missing, say what is missing instead of inventing it.

## Runner selection

- Treat MCP findings as the default evidence source when the runner is not specified.
- Recommend Playwright CLI only for findings that are repeatable, safe, deterministic, and suitable for durable regression coverage.
- Do not imply CLI conversion is required for every MCP finding.

## Procedure

1. Read the findings and align fields to `schemas/web-ux-finding.schema.yaml` when possible.
2. Separate confirmed findings from hypotheses, incomplete reports, and follow-up questions.
3. Group confirmed findings by severity in this order: `critical`, `high`, `medium`, `low`.
4. For each finding, preserve scenario ID, title, reproduction steps, expected result, actual result, evidence, suspected area, and recommended next step.
5. Identify findings that should become Playwright CLI regression tests when they are repeatable, safe, deterministic, and do not depend on production-only data or manual-only state.
6. Call out missing evidence, missing scenario coverage, or unclear ownership separately from confirmed product issues.

## Output

Return:

1. Summary judgment
2. Severity-ordered confirmed findings
3. Hypotheses or incomplete findings
4. Missing evidence to capture next
5. Recommended next steps
6. Suggested Playwright CLI regression-test candidates

Do not claim a finding is confirmed unless the supplied evidence demonstrates the issue.