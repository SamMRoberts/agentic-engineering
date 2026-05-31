#!/usr/bin/env node
// Skill validator: web-ux-test plan validate <path>
// Exit codes: 0 = pass, 1 = schema errors, 2 = usage error

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../../..");
const { validatePlanFile } = await import(path.join(pluginRoot, "lib", "cli", "plan.mjs"));

const planPath = process.argv[2];
if (!planPath) {
    process.stderr.write("ERROR: usage: validate-plan.mjs <plan-path>\n");
    process.exit(2);
}

const result = validatePlanFile(planPath);
if (result.ok) {
    process.stdout.write(`OK ${planPath}: plan validation passed.\n`);
    process.exit(0);
}
for (const err of result.errors) {
    process.stderr.write(`ERROR ${planPath}: ${err}\n`);
}
process.exit(1);
