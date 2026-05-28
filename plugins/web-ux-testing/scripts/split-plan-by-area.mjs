#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";

const planPath = process.argv[2];
const outDir = process.argv[3] ?? "web-ux-test/areas";

if (!planPath) {
  console.error("Usage: node scripts/split-plan-by-area.mjs <plan.yaml> [out-dir]");
  process.exit(2);
}

const plan = YAML.parse(fs.readFileSync(planPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });

for (const area of plan.test_areas ?? []) {
  const safeName = area.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  fs.writeFileSync(path.join(outDir, `${safeName}.yaml`), YAML.stringify(area), "utf8");
  console.log(`Wrote ${safeName}.yaml`);
}
