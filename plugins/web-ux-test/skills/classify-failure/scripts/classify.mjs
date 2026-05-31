#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../../..");
const { runFailureClassify } = await import(path.join(pluginRoot, "lib", "cli", "failure.mjs"));

const result = await runFailureClassify();
if (result.ok) {
    process.stdout.write(`OK category=${result.category} matchedRule=${result.matchedRule ?? "(none)"}.\n`);
    process.exit(0);
}
for (const err of result.errors ?? []) process.stderr.write(`ERROR: ${err}\n`);
process.exit(1);
