#!/usr/bin/env node
// Analyze a normalized test report and emit a failure diagnosis. Deterministic
// first pass; the debugger subagent refines with live Playwright MCP evidence.
// Usage: node analyze-failure.mjs <report.json> [--write] [--json]
import fs from "node:fs";
import { analyzeFailure } from "../../../lib/failure-triage.mjs";

function main(argv) {
  const args = argv.slice(2);
  const write = args.includes("--write");
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("ERROR: usage: analyze-failure.mjs <report.json> [--write] [--json]");
    process.exit(2);
  }

  const report = JSON.parse(fs.readFileSync(file, "utf-8"));
  const diagnosis = analyzeFailure(report);

  if (write) {
    report.diagnosis = diagnosis;
    fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf-8");
    console.log(`OK: wrote diagnosis (${diagnosis.category}) into ${file}`);
  } else if (json) {
    console.log(JSON.stringify(diagnosis, null, 2));
  } else {
    console.log(`Category: ${diagnosis.category} (confidence: ${diagnosis.confidence})`);
    console.log(`Rationale: ${diagnosis.rationale}`);
    for (const r of diagnosis.recommended_repairs) console.log(`Repair: ${r}`);
  }
}

main(process.argv);
