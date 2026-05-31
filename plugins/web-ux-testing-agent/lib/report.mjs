// Normalize a Playwright JSON report into our test-report schema, and render a
// human-readable Markdown summary.

/**
 * Convert a Playwright JSON reporter object into a normalized report for one plan.
 * @param {object} pwJson - parsed output of the Playwright json reporter
 * @param {object} meta - { plan_id, plan_title, run_id, environment }
 */
export function normalizeReport(pwJson, meta = {}) {
  const specs = collectSpecs(pwJson);
  const steps = [];
  let started = Infinity;
  let finished = 0;
  const summary = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };

  for (const spec of specs) {
    for (const test of spec.tests ?? []) {
      const result = (test.results ?? [])[test.results?.length - 1] ?? {};
      const status = mapStatus(result.status ?? test.status);
      summary.total++;
      if (status === "passed") summary.passed++;
      else if (status === "skipped") summary.skipped++;
      else summary.failed++;
      if (test.status === "flaky") summary.flaky++;

      // Map Playwright steps (test.step) to our report steps.
      const reportSteps = flattenSteps(result.steps ?? []);
      if (reportSteps.length === 0) {
        reportSteps.push({ id: spec.title ?? "test", title: spec.title, status, duration_ms: result.duration ?? 0 });
      }
      for (const s of reportSteps) steps.push(s);

      if (result.startTime) started = Math.min(started, Date.parse(result.startTime));
      const dur = result.duration ?? 0;
      if (result.startTime) finished = Math.max(finished, Date.parse(result.startTime) + dur);
    }
  }

  const overall = steps.some((s) => s.status === "failed" || s.status === "timedout")
    ? "failed"
    : steps.length === 0
      ? "skipped"
      : "passed";

  const startIso = Number.isFinite(started) ? new Date(started).toISOString() : new Date().toISOString();
  const finishIso = finished ? new Date(finished).toISOString() : new Date().toISOString();

  return {
    schema_version: "1.0",
    plan_id: meta.plan_id ?? "unknown",
    plan_title: meta.plan_title,
    run_id: meta.run_id ?? String(Date.now()),
    status: overall,
    started_at: startIso,
    finished_at: finishIso,
    duration_ms: Math.max(0, (finished || Date.parse(finishIso)) - (Number.isFinite(started) ? started : Date.parse(startIso))),
    environment: meta.environment ?? {},
    steps,
    artifacts: meta.artifacts ?? {},
    summary
  };
}

function collectSpecs(pwJson) {
  const out = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) out.push(spec);
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of pwJson?.suites ?? []) walk(suite);
  return out;
}

function flattenSteps(pwSteps, acc = []) {
  for (const s of pwSteps) {
    // Only surface test.step() entries (category "test.step").
    if (s.category === "test.step") {
      acc.push({
        id: slug(s.title),
        title: s.title,
        status: s.error ? "failed" : "passed",
        duration_ms: s.duration ?? 0,
        ...(s.error
          ? { error: { message: stripAnsi(s.error.message ?? ""), stack: s.error.stack, snippet: s.error.snippet } }
          : {})
      });
    }
    if (s.steps?.length) flattenSteps(s.steps, acc);
  }
  return acc;
}

function mapStatus(status) {
  switch (status) {
    case "passed":
    case "expected":
      return "passed";
    case "skipped":
      return "skipped";
    case "timedOut":
      return "timedout";
    default:
      return "failed";
  }
}

function slug(s) {
  return String(s ?? "step").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "step";
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\u001b\[[0-9;]*m/g, "");
}

/** Render a normalized report as Markdown. */
export function renderMarkdown(report) {
  const lines = [];
  const icon = report.status === "passed" ? "✅" : "❌";
  lines.push(`# Web UX Test Report — ${report.plan_title ?? report.plan_id}`);
  lines.push("");
  lines.push(`- **Status:** ${icon} ${report.status}`);
  lines.push(`- **Plan:** \`${report.plan_id}\``);
  lines.push(`- **Run:** ${report.run_id}`);
  if (report.environment?.base_url) lines.push(`- **Target:** ${report.environment.base_url} (${report.environment.stage ?? "?"})`);
  lines.push(`- **Started:** ${report.started_at}`);
  lines.push(`- **Duration:** ${Math.round((report.duration_ms ?? 0) / 1000)}s`);
  const s = report.summary ?? {};
  const stepTotal = report.steps.length;
  const stepPassed = report.steps.filter((x) => x.status === "passed").length;
  const stepFailed = report.steps.filter((x) => x.status === "failed" || x.status === "timedout").length;
  const stepSkipped = report.steps.filter((x) => x.status === "skipped").length;
  lines.push(`- **Steps:** ${stepTotal} total · ${stepPassed} passed · ${stepFailed} failed · ${stepSkipped} skipped`);
  if (s.total != null) lines.push(`- **Tests:** ${s.total} total · ${s.passed ?? 0} passed · ${s.failed ?? 0} failed`);
  lines.push("");

  lines.push(`## Steps`);
  lines.push("");
  lines.push(`| # | Step | Status | Duration |`);
  lines.push(`| --- | --- | --- | --- |`);
  report.steps.forEach((st, i) => {
    const mark = st.status === "passed" ? "✅" : st.status === "skipped" ? "⏭️" : "❌";
    lines.push(`| ${i + 1} | ${escapePipes(st.title ?? st.id)} | ${mark} ${st.status} | ${st.duration_ms ?? 0}ms |`);
  });
  lines.push("");

  const failed = report.steps.filter((st) => st.status === "failed" || st.status === "timedout");
  if (failed.length) {
    lines.push(`## Failed steps`);
    lines.push("");
    for (const st of failed) {
      lines.push(`### ❌ ${st.title ?? st.id}`);
      if (st.error?.message) {
        lines.push("");
        lines.push("```");
        lines.push(st.error.message.split("\n").slice(0, 12).join("\n"));
        lines.push("```");
      }
      lines.push("");
    }
  }

  const a = report.artifacts ?? {};
  if (a.trace || a.video || (a.screenshots && a.screenshots.length) || a.html_report) {
    lines.push(`## Artifacts`);
    lines.push("");
    if (a.trace) lines.push(`- Trace: \`${a.trace}\``);
    if (a.video) lines.push(`- Video: \`${a.video}\``);
    if (a.html_report) lines.push(`- HTML report: \`${a.html_report}\``);
    for (const shot of a.screenshots ?? []) lines.push(`- Screenshot: \`${shot}\``);
    lines.push("");
  }

  if (report.diagnosis) {
    lines.push(`## Diagnosis`);
    lines.push("");
    lines.push(`- **Category:** ${report.diagnosis.category} (confidence: ${report.diagnosis.confidence ?? "n/a"})`);
    if (report.diagnosis.rationale) lines.push(`- **Rationale:** ${report.diagnosis.rationale}`);
    for (const r of report.diagnosis.recommended_repairs ?? []) lines.push(`- **Repair:** ${r}`);
    lines.push("");
  }

  return lines.join("\n");
}

function escapePipes(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}
