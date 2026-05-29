#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptsDir, "..");
const registryPath = path.join(pluginRoot, "scenario-library", "registry.yaml");

if (!fs.existsSync(registryPath)) {
  console.error(`ERROR: Scenario registry not found: ${registryPath}`);
  process.exit(2);
}

const registry = YAML.parse(fs.readFileSync(registryPath, "utf8"));
const scenarios = Array.isArray(registry.scenarios) ? registry.scenarios : [];

for (const scenario of scenarios) {
  console.log(`${scenario.id}\t${scenario.priority}\t${scenario.file}\t${scenario.title}`);
}
