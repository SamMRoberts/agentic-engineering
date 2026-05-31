#!/usr/bin/env node
// Resolve / report selector readiness for a plan: lists steps that still need
// discovery (no target or brittle css/xpath) so the debugger can fill them in
// via Playwright MCP. Read-only.
// Usage: node resolve-selectors.mjs <plan.yaml> [--json]
import { loadPlan } from "../../../lib/plan-loader.mjs";
import { isEmptySelector, isAccessible } from "../../../lib/selectors.mjs";

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("ERROR: usage: resolve-selectors.mjs <plan.yaml> [--json]");
    process.exit(2);
  }

  const plan = loadPlan(file);
  const pending = [];
  const sections = ["steps", "assertions", "cleanup"];
  for (const section of sections) {
    for (const step of plan[section] ?? []) {
      const needs = step.needs_discovery || (step.target && isEmptySelector(step.target));
      const brittle = step.target && !isEmptySelector(step.target) && !isAccessible(step.target);
      if (needs || brittle) {
        pending.push({
          section,
          id: step.id,
          action: step.action,
          reason: needs ? "needs_discovery" : "brittle_selector",
          title: step.title ?? null
        });
      }
    }
  }

  if (json) {
    console.log(JSON.stringify({ plan: plan.id, pending }, null, 2));
  } else if (pending.length === 0) {
    console.log("OK: all selectors are accessible and resolved");
  } else {
    for (const p of pending) {
      console.error(`PENDING: ${p.section}[${p.id}] ${p.action} — ${p.reason}`);
    }
  }
  process.exit(pending.length > 0 ? 1 : 0);
}

main(process.argv);
