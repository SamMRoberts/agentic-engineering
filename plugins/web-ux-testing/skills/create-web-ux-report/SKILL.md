---
name: create-web-ux-report
description: 'Use when creating a web UX testing report from analyzed findings, CLI results, ARIA snapshot reviews, or exploratory evidence. Use for engineering triage, accessibility review, product summaries, CI regression summaries, and issue-ready markdown. Do not use for raw browser execution or test generation.'
argument-hint: 'Provide analysis summary, findings file, report audience, output path, and desired report type.'
user-invocable: true
---

# Create Web UX Report

Create a report from analyzed web UX testing results without reinterpreting raw evidence or inventing missing details.

## Required inputs

- Analysis summary or findings file, defaulting to `web-ux-test/results.yaml` when available
- Report audience: engineering triage, accessibility review, product summary, CI regression summary, or issue-ready markdown
- Output path when a file should be written
- Evidence bundle or artifact references when findings are not already analyzed
- Desired scope: all findings, selected severity, selected scenarios, selected release, or selected workflow

If analysis is missing, ask for results analysis first or produce a report that clearly separates confirmed findings from unreviewed raw evidence.

## Runner selection

- Describe unspecified browser-test evidence as Playwright MCP by default.
- Describe Playwright CLI only for explicit generated regression runs, existing test commands, CI results, or ARIA baseline diffs.
- Keep MCP exploratory findings and CLI regression outcomes in separate report sections when both are present.

## Procedure

1. Use the analyzed findings as the source of truth.
2. Select the report format for the audience and scope.
3. Lead with critical and high confirmed findings, followed by medium and low findings.
4. Keep hypotheses, missing evidence, and follow-up questions separate from confirmed issues.
5. Include evidence references, artifact paths, and scenario or finding IDs.
6. Include regression-test recommendations and next actions.
7. Use `templates/web-ux-report.template.md` when writing a report file.

## Safety and quality rules

- Do not expose private user data from screenshots, logs, traces, ARIA baselines, or findings.
- Do not invent owners, dates, severity, or evidence.
- Do not auto-approve ARIA baselines or test failures as acceptable.
- Keep raw output excerpts short and relevant.

## Output

Return or write:

- report title and scope
- summary judgment
- confirmed findings by severity
- evidence and artifact references
- missing evidence and hypotheses
- recommended next actions
- regression-test candidates
- appendix with raw artifact references when useful
