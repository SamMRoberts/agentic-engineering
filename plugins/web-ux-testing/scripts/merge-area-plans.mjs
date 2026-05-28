#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";

const basePlanPath = process.argv[2];
const areasDir = process.argv[3] ?? "web-ux-test/areas";
const outPath = process.argv[4] ?? "web-ux-test/plan.merged.yaml";

if (!basePlanPath) {
  console.error("Usage: node scripts/merge-area-plans.mjs <base-plan.yaml> [areas-dir] [out-plan.yaml]");
  process.exit(2);
}

const plan = YAML.parse(fs.readFileSync(basePlanPath, "utf8"));
const files = fs.readdirSync(areasDir).filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
plan.test_areas = files.map((file) => YAML.parse(fs.readFileSync(path.join(areasDir, file), "utf8")));
fs.writeFileSync(outPath, YAML.stringify(plan), "utf8");
console.log(`Merged ${files.length} area files into ${outPath}`);
