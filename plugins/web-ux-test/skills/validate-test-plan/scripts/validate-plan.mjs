#!/usr/bin/env node
// Skill validator: same as create-test-plan/scripts/validate-plan.mjs — kept under
// validate-test-plan/ so the skill is fully self-contained for discoverability.
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
