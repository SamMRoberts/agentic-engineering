---
name: write-web-frontend-engineering-report
description: 'Use when generating the engineer-facing Markdown findings report for a web frontend Playwright run. Aggregates findings by severity and category, recaps the surface inventory, lists coverage gaps, and recommends regression candidates. Use for: engineering report, findings report, post-run engineering summary. Do not use for: producing the executive HTML summary, executing scenarios, or modifying tests.'
argument-hint: 'Report directory, plan path, findings directory, surface inventory (or path to it), and any severity rubric overrides.'
user-invocable: false
---

# Write Web Frontend Engineering Report

Aggregate Playwright CLI and MCP findings into a single `engineering-report.md` for engineers.

## When to Use

- All approved scenarios have executed (pass, fail, blocked, or stopped) and findings files exist.
- The user asks for "the engineering report" or "the full findings report".
- A prior report needs to be regenerated after additional scenario runs.

## Inputs

- `report_dir` (default: `./reports/web-frontend-testing/<timestamp>/`).
- `plan_path` (default: `<report_dir>/test-plan.yaml`).
- `findings_dir` (default: `<report_dir>/findings/`).
- Surface inventory (object) or path to a YAML file containing it.
- Optional severity rubric overrides.

If any required input is missing, return without writing the file and list the gap.

## Procedure

1. Load the plan and enumerate executed scenarios with their `status`.
2. Load every YAML file under `findings_dir`. Validate each entry has `id`, `scenario_id`, `severity`, `category`, `summary`, and `evidence`. Skip and log malformed entries.
3. Compute run metadata: target, stage, runner, scenario counts, pass/fail/blocked/stopped counts, and total findings by severity.
4. Group findings by severity (`critical > high > medium > low > info`), then by category within each severity.
5. Identify coverage gaps by diffing the Surface Inventory against scenarios in the plan.
6. Suggest regression candidates: any `P1` or `P2` finding with reproducible evidence is a candidate; mark `low`/`info` as non-candidates.
7. Redact any credential-shaped strings before writing.
8. Write the report to `<report_dir>/engineering-report.md` using the section order below.

## Required Section Order

1. **Title**: `# Web Frontend Testing — Engineering Report`
2. **Run metadata table**: target, stage, runner, scenarios executed, pass/fail/blocked/stopped counts, total duration if available.
3. **Surface Inventory recap**: bullet summary of framework, route count, interactive flow count, auth surfaces, a11y signals, destructive flows.
4. **Findings**: one `## Severity: <level>` section per severity that has findings. Within each, group by category. Each finding includes:
   - Summary line.
   - Scenario link (e.g., `Scenario: signin-form-validation`).
   - Observed vs. Expected.
   - Evidence references (relative paths into `findings/`).
   - Reproduction steps.
   - Suggested fix (when present).
5. **Coverage gaps**: bulleted list of uncovered routes/flows from the inventory.
6. **Recommended follow-up scenarios**: short ids + titles + rationale.
7. **Regression candidates**: bulleted list with rationale; note that promotion to Playwright CLI is a separate workflow.

## Quality Rules

- Every finding entry must link to its evidence files. Findings without evidence go in an `Unverified / missing evidence` subsection of their severity.
- Do not invent findings or counts. Numbers must match the files in `findings_dir`.
- Use workspace-relative paths in all links.

## Output

Return:

- `engineering_report_path`
- `findings_by_severity`: `{ critical, high, medium, low, info }`
- `coverage_gaps`
- `regression_candidates`
- `skipped_findings`: malformed entries that were excluded with reasons
- `recommended_next_action`
