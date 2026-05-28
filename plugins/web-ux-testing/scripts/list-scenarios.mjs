#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const registryPath = path.resolve("scenario-library/registry.yaml");
const registry = YAML.parse(fs.readFileSync(registryPath, "utf8"));

for (const scenario of registry.scenarios ?? []) {
  console.log(`${scenario.id}\t${scenario.priority}\t${scenario.file}\t${scenario.title}`);
}
