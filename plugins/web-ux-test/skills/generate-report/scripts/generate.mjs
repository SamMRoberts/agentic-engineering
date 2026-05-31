#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../../..");
const { runReportGenerate } = await import(path.join(pluginRoot, "lib", "cli", "report.mjs"));

const result = await runReportGenerate();
if (result.ok) {
    process.stdout.write(`OK markdown=${result.markdownPath} html=${result.htmlPath}\n`);
    process.exit(0);
}
for (const err of result.errors ?? []) process.stderr.write(`ERROR: ${err}\n`);
process.exit(1);
