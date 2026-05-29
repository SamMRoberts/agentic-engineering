---
description: 'Use when summarizing web UX exploratory testing findings into a severity-ordered report with evidence, next steps, and regression-test recommendations.'
agent: web-ux-testing-agent
argument-hint: 'Findings file, pasted findings, scenario IDs, or evidence bundle to summarize.'
---

Summarize the web UX testing findings.

Use the finding schema when possible.

Group findings by:

1. Critical
2. High
3. Medium
4. Low

For each finding include:

- scenario id
- title
- severity
- reproduction steps
- expected result
- actual result
- evidence
- suspected area
- recommended next step
- whether it should become a Playwright CLI regression test

Do not invent evidence.
If evidence is missing, say what is missing.
Separate confirmed findings from hypotheses or follow-up questions.
