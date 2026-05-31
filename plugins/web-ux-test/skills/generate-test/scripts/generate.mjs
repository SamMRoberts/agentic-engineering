#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../../..");
const { runTestGenerate } = await import(path.join(pluginRoot, "lib", "cli", "test.mjs"));

const result = await runTestGenerate();
if (result.ok) {
    process.stdout.write(`OK generated ${result.specPath} (phase: ${result.phase}).\n`);
    process.exit(0);
}
for (const err of result.errors ?? []) process.stderr.write(`ERROR: ${err}\n`);
process.exit(1);
