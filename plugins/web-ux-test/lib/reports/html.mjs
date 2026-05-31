/**
 * HTML report renderer. Single-file output (no external assets), accessible markup.
 */

function escape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function stepRow(step) {
    return `<tr><td>${escape(step.id)}</td><td class="status status-${escape(step.status)}">${escape(step.status)}</td><td>${escape(step.errorMessage ?? step.title ?? "")}</td></tr>`;
}

export function renderHtml({ runRecord, finalPhase }) {
    const failing = runRecord.steps?.find((s) => s.status === "failed");
    const summaryText = runRecord.status === "passed"
        ? `All ${runRecord.steps?.length ?? 0} step(s) passed.`
        : `The test failed${failing ? ` at step "${failing.id}"` : ""}.`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Web UX Test Report: ${escape(runRecord.planId)}</title>
<style>
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 2rem; line-height: 1.5; color: #1f2937; }
h1 { margin-top: 0; }
dl.meta { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
dl.meta dt { font-weight: 600; }
.status-passed { color: #047857; font-weight: 600; }
.status-failed { color: #b91c1c; font-weight: 600; }
.status-skipped { color: #6b7280; }
.summary { padding: 1rem; background: ${runRecord.status === "passed" ? "#ecfdf5" : "#fef2f2"}; border-radius: 0.5rem; border-left: 4px solid ${runRecord.status === "passed" ? "#10b981" : "#dc2626"}; margin: 1rem 0; }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
th { background: #f9fafb; font-weight: 600; }
code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
ul.artifacts { padding-left: 1.25rem; }
ul.artifacts li { margin: 0.25rem 0; }
</style>
</head>
<body>
<h1>Web UX Test Report: <code>${escape(runRecord.planId)}</code></h1>
<dl class="meta">
<dt>Status</dt><dd class="status-${escape(runRecord.status)}">${escape(runRecord.status)}</dd>
<dt>Run ID</dt><dd><code>${escape(runRecord.runId)}</code></dd>
<dt>Browser</dt><dd>${escape(runRecord.browser)}</dd>
<dt>Headless</dt><dd>${escape(runRecord.headless)}</dd>
<dt>Auth mode</dt><dd>${escape(runRecord.authMode ?? "none")}</dd>
<dt>Started</dt><dd>${escape(runRecord.startedAt)}</dd>
<dt>Finished</dt><dd>${escape(runRecord.finishedAt)}</dd>
<dt>Exit code</dt><dd>${escape(runRecord.exitCode)}</dd>
<dt>Final phase</dt><dd>${escape(finalPhase ?? "(unknown)")}</dd>
${runRecord.failure ? `<dt>Failure category</dt><dd>${escape(runRecord.failure.category)}</dd>` : ""}
</dl>
<div class="summary" role="status">${escape(summaryText)}</div>
${runRecord.failure?.errorSummary ? `<blockquote>${escape(runRecord.failure.errorSummary)}</blockquote>` : ""}
<h2>Executed Steps</h2>
<table>
<thead><tr><th scope="col">Step</th><th scope="col">Status</th><th scope="col">Notes</th></tr></thead>
<tbody>
${(runRecord.steps ?? []).map(stepRow).join("\n")}
</tbody>
</table>
<h2>Artifacts</h2>
<ul class="artifacts">
${runRecord.artifacts?.stdoutPath ? `<li>Playwright stdout: <code>${escape(runRecord.artifacts.stdoutPath)}</code></li>` : ""}
${runRecord.artifacts?.stderrPath ? `<li>Playwright stderr: <code>${escape(runRecord.artifacts.stderrPath)}</code></li>` : ""}
${runRecord.artifacts?.playwrightJsonPath ? `<li>Playwright JSON reporter: <code>${escape(runRecord.artifacts.playwrightJsonPath)}</code></li>` : ""}
${runRecord.artifacts?.tracePath ? `<li>Trace: <code>${escape(runRecord.artifacts.tracePath)}</code></li>` : ""}
${(runRecord.artifacts?.screenshotPaths ?? []).map((sp) => `<li>Screenshot: <code>${escape(sp)}</code></li>`).join("\n")}
</ul>
</body>
</html>
`;
}
