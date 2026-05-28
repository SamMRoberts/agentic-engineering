#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const name = arg("name", "example-app");
const baseUrl = arg("base-url", "http://localhost:5173");
const runner = arg("runner", "playwright-mcp");
const auth = arg("auth", "none");
const outDir = path.resolve(arg("out", "web-ux-test"));

const plan = {
  name: `${name}-web-ux-test-plan`,
  version: "0.1",
  description: `Structured web UX testing plan for ${name}.`,
  runner: {
    type: runner,
    base_url: baseUrl,
    environment: "local",
    browser: "chromium",
    mode: "headed",
    viewport: { width: 1440, height: 900 },
    test_id_attribute: "data-testid"
  },
  scope: {
    include: ["app startup", "navigation", "forms", "workflows", "accessibility", "responsive layout", "error states"],
    exclude: ["destructive production actions", "external account changes"]
  },
  auth: {
    required: auth !== "none",
    strategy: auth,
    credentials_policy: "never_store_credentials",
    unauthenticated_behavior: auth === "none" ? "run_unauthenticated_tests_only" : "pause_for_manual_login",
    verify_before_each_area: auth !== "none"
  },
  rules: {
    do_not_modify_code: true,
    report_before_fixing: true,
    prefer_accessibility_snapshot: true,
    prefer_test_ids: true,
    capture_console_errors: true,
    capture_network_failures: true,
    capture_screenshots_on_failure: true,
    avoid_destructive_actions: true,
    avoid_infinite_exploration: true,
    max_scenarios_per_area: 8
  },
  severity: {
    critical: "Data loss, security issue, or primary workflow impossible to complete.",
    high: "Primary workflow blocked or major user-facing failure.",
    medium: "Secondary workflow broken, confusing, or unreliable.",
    low: "Cosmetic, copy, spacing, or minor accessibility issue."
  },
  evidence: {
    include: ["reproduction_steps", "expected_result", "actual_result", "screenshot", "console_errors", "network_failures", "accessibility_snapshot", "url", "browser", "viewport"]
  },
  test_areas: []
};

fs.mkdirSync(path.join(outDir, "areas"), { recursive: true });
fs.writeFileSync(path.join(outDir, "plan.yaml"), YAML.stringify(plan), "utf8");
fs.writeFileSync(path.join(outDir, "config.yaml"), YAML.stringify({ runner: plan.runner, auth: plan.auth, rules: plan.rules }), "utf8");
console.log(`Scaffolded ${outDir}`);
