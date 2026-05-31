// Normalize a Playwright JSON report into our TestReport and write report.json +
// report.md into a report directory.
import fs from "node:fs";
import path from "node:path";
import type { TestPlan, TestReport } from "./types.js";
import { normalizeReport, renderMarkdown } from "../../lib/report.mjs";
import type { CollectedArtifacts } from "./artifacts.js";

export interface WriteReportOptions {
  plan: TestPlan;
  pwJson: unknown;
  reportDir: string;
  runId?: string;
  artifacts?: CollectedArtifacts;
}

export function writeReport(opts: WriteReportOptions): TestReport {
  const { plan, pwJson, reportDir } = opts;
  const report = normalizeReport(pwJson, {
    plan_id: plan.id,
    plan_title: plan.title,
    run_id: opts.runId ?? path.basename(reportDir),
    environment: plan.environment ?? {},
    artifacts: {
      playwright_json: "results.json",
      ...(opts.artifacts ?? {})
    }
  }) as TestReport;

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(path.join(reportDir, "report.md"), renderMarkdown(report), "utf-8");
  return report;
}
