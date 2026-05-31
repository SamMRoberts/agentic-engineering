#!/usr/bin/env node
// Suggest a minimal plan repair for a failed report by mapping the diagnosis
// category to concrete, plan-level edit guidance. Read-only; prints guidance.
// Usage: node suggest-plan-repair.mjs <report.json> [--plan <plan.yaml>] [--json]
import fs from "node:fs";
import { analyzeFailure } from "../../../lib/failure-triage.mjs";

const REPAIRS = {
  selector_drift: [
    "Re-discover the failing element with Playwright MCP (browser_snapshot).",
    "Replace the step target with an accessible locator (role/name, label, or test_id).",
    "Re-run resolve-selectors.mjs to confirm no brittle selectors remain."
  ],
  timing_issue: [
    "Insert a wait_for step (state: visible) on the element before the failing action.",
    "Increase timeout_ms on the failing step only; do not add fixed sleeps.",
    "Prefer asserting an observable post-condition over arbitrary waits."
  ],
  missing_auth: [
    "Re-run save-storage-state.mjs to refresh the session.",
    "Confirm environment.auth.strategy and storage_state_path point at the fresh file.",
    "Verify the file with verify-storage-state.mjs before re-running."
  ],
  changed_workflow: [
    "Walk the live workflow with Playwright MCP and compare to the plan steps.",
    "Add, remove, or reorder steps to match the current UI flow.",
    "Update affected assertions to the new success criteria."
  ],
  environment_issue: [
    "Confirm environment.base_url is reachable from this machine.",
    "Check VPN/proxy/cert requirements; this is not a test defect."
  ],
  invalid_test_plan: [
    "Fix the malformed step flagged in the error.",
    "Re-validate with validate-plan.mjs until there are zero errors."
  ],
  product_bug: [
    "Do not change the test. Capture the trace/screenshot as evidence.",
    "File a product bug with observed vs. expected behavior."
  ],
  unknown: ["Re-run with the trace viewer and inspect the failing step manually."]
};

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("ERROR: usage: suggest-plan-repair.mjs <report.json> [--json]");
    process.exit(2);
  }

  const report = JSON.parse(fs.readFileSync(file, "utf-8"));
  const diagnosis = report.diagnosis ?? analyzeFailure(report);
  const repairs = REPAIRS[diagnosis.category] ?? REPAIRS.unknown;
  const out = { category: diagnosis.category, confidence: diagnosis.confidence, repairs };

  if (json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`Suggested repair for ${diagnosis.category} (confidence: ${diagnosis.confidence}):`);
    for (const r of repairs) console.log(`- ${r}`);
  }
}

main(process.argv);
