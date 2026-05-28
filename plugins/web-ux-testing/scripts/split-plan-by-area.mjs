#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";
import { toSafeFileName } from "./lib/yaml-utils.mjs";

const planPath = process.argv[2];
const outDir = process.argv[3] ?? "web-ux-test/areas";

if (!planPath) {
  console.error("Usage: node scripts/split-plan-by-area.mjs <plan.yaml> [out-dir]");
  process.exit(2);
}

const plan = YAML.parse(fs.readFileSync(planPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });

if (!Array.isArray(plan.test_areas) || plan.test_areas.length === 0) {
  console.error(`ERROR: No test areas found in ${planPath}`);
  process.exit(2);
}

const usedNames = new Map();
for (const area of plan.test_areas) {
  const baseName = toSafeFileName(area.name);
  const index = usedNames.get(baseName) ?? 0;
  usedNames.set(baseName, index + 1);
  const safeName = index === 0 ? baseName : `${baseName}-${index + 1}`;

  fs.writeFileSync(path.join(outDir, `${safeName}.yaml`), YAML.stringify(area), "utf8");
  console.log(`Wrote ${safeName}.yaml`);
}
