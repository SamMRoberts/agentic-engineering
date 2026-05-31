#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../../..");
const { runStateValidate } = await import(path.join(pluginRoot, "lib", "cli", "state.mjs"));

const result = runStateValidate();
if (result.ok) {
    process.stdout.write("OK state.json validates.\n");
    process.exit(0);
}
for (const err of result.errors) process.stderr.write(`ERROR: ${err}\n`);
process.exit(1);
