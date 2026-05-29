#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const scenarioId = arg("scenario", "ARIA-001");
const title = arg("title", "ARIA snapshot regression");
const route = arg("route", "/");
const role = arg("role", "main");
const name = arg("name", "");
const baseline = arg("baseline", `${scenarioId.toLowerCase()}.aria.yml`);
const outDir = arg("out-dir", "tests/aria");

fs.mkdirSync(outDir, { recursive: true });

const testPath = path.join(outDir, `${scenarioId.toLowerCase()}.spec.ts`);
const baselinePath = path.join(outDir, baseline);

const locator = name
  ? `page.getByRole('${role}', { name: '${name}' })`
  : `page.getByRole('${role}')`;

const testContent = `import { test, expect } from '@playwright/test';

test('${scenarioId} ${title}', async ({ page }) => {
  await page.goto('${route}');

  const target = ${locator};
  await expect(target).toBeVisible();
  await expect(target).toMatchAriaSnapshot({ name: '${baseline}' });
});
`;

const baselineContent = `# Review before accepting this baseline. Keep dynamic/private content out.
- ${role}${name ? ` "${name}"` : ""}
`;

if (!fs.existsSync(testPath)) fs.writeFileSync(testPath, testContent, "utf8");
if (!fs.existsSync(baselinePath)) fs.writeFileSync(baselinePath, baselineContent, "utf8");

console.log(`Created ${testPath}`);
console.log(`Created ${baselinePath}`);
