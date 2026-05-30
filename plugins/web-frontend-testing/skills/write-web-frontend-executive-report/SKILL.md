---
name: write-web-frontend-executive-report
description: 'Use when generating the self-contained HTML executive summary for a web frontend Playwright run. Produces a single accessible HTML file with risk overview, top findings, user-impact themes, and recommended actions. Use for: executive report, stakeholder summary, HTML report, leadership-facing UX summary. Do not use for: producing the engineering Markdown report, executing scenarios, or distributing reports.'
argument-hint: 'Report directory, engineering report path, findings directory, plan path, and target audience (default: cross-functional stakeholders).'
user-invocable: false
---

# Write Web Frontend Executive Report

Generate a **single self-contained accessible HTML file** that summarizes the run for non-engineering stakeholders.

## When to Use

- The engineering report has been written and findings are stable.
- The user asks for "the executive report", "an HTML summary", or "a leadership-facing report".

## Inputs

- `report_dir` (default: `./reports/web-frontend-testing/<timestamp>/`).
- `engineering_report_path` (default: `<report_dir>/engineering-report.md`).
- `findings_dir` (default: `<report_dir>/findings/`).
- `plan_path` (default: `<report_dir>/test-plan.yaml`).
- `audience` (default: `cross-functional stakeholders`).

## Procedure

1. Load the plan, findings, and engineering report to gather run metadata and finding counts.
2. Select the **Top 5 findings** for the executive view, prioritized as: all `critical`, then `high` ordered by user impact, then any reproducible `medium` with clear user impact.
3. Group findings into 2–5 **User-Impact Themes** (e.g., "Sign-in friction", "Checkout reliability", "Screen reader gaps"). Each theme summarizes the pattern, affected user actions, and recommended owner-agnostic next step.
4. Draft 3–7 **Recommended Next Actions**. Keep them outcome-oriented and free of tool jargon.
5. Redact any credential-shaped strings and any selectors that leak internal naming.
6. Render the HTML using [./templates/executive-report.template.html](./templates/executive-report.template.html). Replace `{{...}}` placeholders. Do not add any `<script>`, external `<link>`, or remote `<img>` references.
7. Write the file to `<report_dir>/executive-report.html`.

## Hard Requirements

- **Single file. No external assets.** Inline CSS only. No JavaScript. No remote fonts, scripts, images, or tracking pixels.
- **Accessible markup**: `<main>`, `<section>`, `<h1>`–`<h3>`, `<ul>`/`<ol>`, `<table>` with `<thead>` and `<th scope="col">`.
- **Severity badges include a text label**. Never rely on color alone. Maintain WCAG AA contrast (≥ 4.5:1 for body text, ≥ 3:1 for large text).
- **Plain language**. No selectors, tool names, or stack traces in the body of the report (the appendix link is where engineers go for that).
- **Appendix link** to the engineering report uses a relative path (e.g., `./engineering-report.md`).

## Section Order

1. Executive Summary (2–4 sentences).
2. Risk Overview (counts by severity in an accessible table).
3. Top 5 Findings (plain-language list with user impact).
4. User-Impact Themes (2–5 short sections).
5. Recommended Next Actions (3–7 bullets).
6. Appendix link to the engineering report.

## Output

Return:

- `executive_report_path`
- `top_findings_ids`
- `themes`: list of theme titles
- `recommended_next_actions_count`
- `accessibility_checks`: short pass/fail list (headings hierarchy, table headers present, color-not-sole-channel, no external assets)

## Resources

- [./templates/executive-report.template.html](./templates/executive-report.template.html) — accessible, asset-free HTML skeleton with inline CSS.
