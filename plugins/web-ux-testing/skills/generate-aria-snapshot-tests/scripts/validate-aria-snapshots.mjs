#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const dir = process.argv[2] ?? "tests/aria";
const root = path.resolve(dir);
const warnings = [];
const errors = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

const files = walk(root).filter((file) => file.endsWith(".aria.yml"));

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const relative = path.relative(process.cwd(), file);

  if (/password|token|secret|api[_-]?key|session/i.test(content)) {
    errors.push(`${relative}: possible sensitive content in ARIA baseline.`);
  }

  if (/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b/.test(content)) {
    warnings.push(`${relative}: possible timestamp/date in ARIA baseline; prefer regex or scoped snapshot.`);
  }

  if (content.split("\n").length > 120) {
    warnings.push(`${relative}: large ARIA baseline; prefer smaller locator-scoped snapshots.`);
  }

  if (!/-\s+(heading|main|navigation|button|link|textbox|form|dialog|menu|list|region|status|alert)\b/.test(content)) {
    warnings.push(`${relative}: baseline may not include meaningful roles.`);
  }
}

if (files.length === 0) {
  warnings.push(`${dir}: no .aria.yml baseline files found.`);
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length > 0) process.exit(1);
console.log(`ARIA snapshot validation completed for ${files.length} baseline file(s).`);
