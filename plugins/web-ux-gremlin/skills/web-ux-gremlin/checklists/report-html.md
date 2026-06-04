# Web UX Gremlin Report — HTML Format

Use this layout when the run contract requests `report=html` or `report=both`. The HTML report exists to give a non-CLI reader a scannable, shareable summary of one bug-hunt run. Markdown remains the source of truth.

## Output Location

- Save HTML reports under `specs/reports/`.
- File name: `web-ux-gremlin-report-<YYYYMMDD-HHMM>.html` using the run start time (UTC).
- When `report=both`, save the Markdown report next to it with the same base name and `.md` extension so the two stay paired.
- Never overwrite an existing report file. If the target path already exists, append `-2`, `-3`, etc.

## Required Sections

The HTML report must include, in order:

1. Run header: target URL or app, mode (`standard` or `gremlin`), gremlin intensity (or `n/a`), browser, tool, run mode, safe-fixtures flag, high-chaos confirmation, run start and end timestamps (UTC).
2. Plan reference: relative link to the Markdown plan under `specs/`.
3. Test results table: spec file (relative path), test name, suite, status (`passed`, `failed`, `flaky`, `skipped`, `fixme`), duration, browser project, first actionable error (if any).
4. UX findings: each finding with title, severity (`info`, `low`, `medium`, `high`), affected flow, repro steps from the plan, observed behavior, expected behavior, recovery outcome, related test file, and screenshot or trace links when Playwright produced them.
5. Healed failures: original failure, root cause classification (`product`, `test`, `selector`, `environment`), fix applied, rerun status.
6. Coverage gaps: auth, data, accessibility, responsive layout, environment, or scope items not covered.
7. Footer: skill version line (`web-ux-gremlin SKILL.md`) and the exact run contract string from the Markdown report.

## Authoring Rules

- The HTML file must be self-contained: inline `<style>`, no external CDN, no `<script>` requests over the network. Use UTF-8.
- Use semantic HTML (`<header>`, `<section>`, `<table>`, `<dl>`, `<details>`/`<summary>` for long error bodies).
- Provide visible status colors that still pass color-contrast on a white background and do not rely on color alone (also use a status word in every status cell).
- Escape `<`, `>`, `&`, and `"` in any user-visible string, especially test names, errors, and URLs.
- Wrap long error output in `<pre>` inside a collapsed `<details>` block so the page stays scannable.
- Do not embed cookies, tokens, authorization headers, connection strings, environment variables, or other secrets. Redact any captured request or response that includes them.
- Do not embed external trace URLs that require authentication; link to local `playwright-report/` or `test-results/` paths when available.
- Keep file size reasonable: prefer linking to Playwright trace files instead of inlining screenshots, unless a screenshot is small (under ~200 KB) and essential to the finding.

## Minimal Skeleton

Use this skeleton as a starting point and fill in the sections above. Keep the embedded CSS; do not add network requests.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Web UX Gremlin Report — {{target}} — {{run_start_utc}}</title>
    <style>
      :root { color-scheme: light; }
      body { font: 14px/1.5 system-ui, sans-serif; margin: 2rem; color: #111; background: #fff; }
      h1, h2, h3 { line-height: 1.2; }
      header.run-meta dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
      table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
      th, td { border: 1px solid #d0d0d0; padding: 0.5rem; text-align: left; vertical-align: top; }
      th { background: #f4f4f4; }
      .status-passed { background: #e6f4ea; }
      .status-failed { background: #fce8e6; }
      .status-flaky  { background: #fef7e0; }
      .status-skipped, .status-fixme { background: #eceff1; }
      .sev-high   { border-left: 4px solid #b00020; padding-left: 0.5rem; }
      .sev-medium { border-left: 4px solid #e69500; padding-left: 0.5rem; }
      .sev-low    { border-left: 4px solid #1a73e8; padding-left: 0.5rem; }
      details > summary { cursor: pointer; }
      pre { white-space: pre-wrap; word-break: break-word; background: #f6f8fa; padding: 0.5rem; }
      footer { margin-top: 2rem; color: #555; font-size: 0.85em; }
    </style>
  </head>
  <body>
    <header class="run-meta">
      <h1>Web UX Gremlin Report</h1>
      <dl>
        <dt>Target</dt><dd>{{target}}</dd>
        <dt>Mode</dt><dd>{{mode}}</dd>
        <dt>Intensity</dt><dd>{{intensity_or_na}}</dd>
        <dt>Browser</dt><dd>{{browser}}</dd>
        <dt>Tool</dt><dd>{{tool}}</dd>
        <dt>Run mode</dt><dd>{{run_mode}}</dd>
        <dt>Safe fixtures</dt><dd>{{safe_fixtures}}</dd>
        <dt>High-chaos approved</dt><dd>{{high_chaos_approved}}</dd>
        <dt>Start (UTC)</dt><dd>{{run_start_utc}}</dd>
        <dt>End (UTC)</dt><dd>{{run_end_utc}}</dd>
        <dt>Plan</dt><dd><a href="{{plan_relative_path}}">{{plan_relative_path}}</a></dd>
      </dl>
    </header>

    <section><h2>Test Results</h2><!-- results table per "Required Sections" --></section>
    <section><h2>UX Findings</h2><!-- finding blocks per "Required Sections" --></section>
    <section><h2>Healed Failures</h2><!-- healed entries per "Required Sections" --></section>
    <section><h2>Coverage Gaps</h2><!-- gaps per "Required Sections" --></section>

    <footer>
      <div>Generated by web-ux-gremlin SKILL.md</div>
      <div>Run contract: {{run_contract}}</div>
    </footer>
  </body>
</html>
```

## Quality Checks

Before declaring the HTML report done:

- Open the file in a browser and confirm it renders without network requests (developer tools network tab should show only the document).
- Confirm every status cell has both a color class and a status word.
- Confirm no secret values, tokens, or production identifiers are present.
- Confirm the run contract in the footer matches the run contract recorded in the Markdown report exactly.
- Confirm the file is saved under `specs/reports/` and the paired Markdown report (if `report=both`) shares the base name.
