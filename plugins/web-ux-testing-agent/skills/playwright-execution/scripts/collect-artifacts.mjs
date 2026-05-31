#!/usr/bin/env node
// Collect Playwright artifacts (traces, videos, screenshots) into a report
// directory and update report.json artifact paths. Read/scan + path-record only.
// Usage: node collect-artifacts.mjs --report-dir <dir> [--results <playwright-output-dir>]
import fs from "node:fs";
import path from "node:path";

function getArg(args, name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

function walk(dir, acc = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function main(argv) {
  const args = argv.slice(2);
  const reportDir = getArg(args, "--report-dir");
  const resultsDir = getArg(args, "--results", path.join(reportDir ?? ".", "test-results"));
  if (!reportDir) {
    console.error("ERROR: usage: collect-artifacts.mjs --report-dir <dir> [--results <dir>]");
    process.exit(2);
  }

  const files = walk(resultsDir);
  const artifacts = { screenshots: [] };
  for (const f of files) {
    const rel = path.relative(reportDir, f);
    if (f.endsWith(".zip") || f.includes("trace")) artifacts.trace = rel;
    else if (f.endsWith(".webm") || f.endsWith(".mp4")) artifacts.video = rel;
    else if (f.endsWith(".png") || f.endsWith(".jpeg")) artifacts.screenshots.push(rel);
  }

  const reportJsonPath = path.join(reportDir, "report.json");
  if (fs.existsSync(reportJsonPath)) {
    const report = JSON.parse(fs.readFileSync(reportJsonPath, "utf-8"));
    report.artifacts = { ...(report.artifacts ?? {}), ...artifacts };
    fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`OK: recorded ${artifacts.screenshots.length} screenshot(s), trace=${!!artifacts.trace}, video=${!!artifacts.video}`);
  } else {
    console.log(JSON.stringify(artifacts, null, 2));
  }
}

main(process.argv);
