#!/usr/bin/env node
// Produce a one-paragraph summary of a normalized test report for chat replies
// or PR comments. Highlights the first failed step and overall counts.
// Usage: node summarize-report.mjs <report.json> [--json]
import fs from "node:fs";

export function summarize(report) {
  const s = report.summary ?? {};
  const total = s.total ?? (report.steps ?? []).length;
  const failedSteps = (report.steps ?? []).filter(
    (st) => st.status === "failed" || st.status === "timedout"
  );
  const headline =
    report.status === "passed"
      ? `✅ ${report.plan_title ?? report.plan_id} passed (${total} steps).`
      : `❌ ${report.plan_title ?? report.plan_id} failed: ${failedSteps.length} of ${total} step(s) failed.`;

  const parts = [headline];
  if (failedSteps.length) {
    const first = failedSteps[0];
    parts.push(`First failure at "${first.title ?? first.id}".`);
    if (report.diagnosis?.category) {
      parts.push(`Likely cause: ${report.diagnosis.category} (${report.diagnosis.confidence ?? "n/a"}).`);
    }
  }
  if (report.artifacts?.trace) parts.push(`Trace available.`);
  return parts.join(" ");
}

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("ERROR: usage: summarize-report.mjs <report.json> [--json]");
    process.exit(2);
  }
  const report = JSON.parse(fs.readFileSync(file, "utf-8"));
  const text = summarize(report);
  if (json) console.log(JSON.stringify({ summary: text, status: report.status }, null, 2));
  else console.log(text);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
