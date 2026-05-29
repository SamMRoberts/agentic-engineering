#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { arg } from "./lib/cli-utils.mjs";
import { toSafeFileName } from "./lib/yaml-utils.mjs";

const scenarioId = arg("scenario", "ARIA-001");
const title = arg("title", "ARIA snapshot regression");
const route = arg("route", "/");
const role = arg("role", "main");
const name = arg("name", "");
const fileSafeScenarioId = toSafeFileName(scenarioId);
const baseline = arg("baseline", `${fileSafeScenarioId}.aria.yml`);
const outDir = arg("out-dir", "tests/aria");

fs.mkdirSync(outDir, { recursive: true });

const testPath = path.join(outDir, `${fileSafeScenarioId}.spec.ts`);
const baselinePath = path.join(outDir, baseline);

const locator = name
  ? `page.getByRole(${JSON.stringify(role)}, { name: ${JSON.stringify(name)} })`
  : `page.getByRole(${JSON.stringify(role)})`;

const testContent = `import { test, expect } from "@playwright/test";

test(${JSON.stringify(`${scenarioId} ${title}`)}, async ({ page }) => {
  await page.goto(${JSON.stringify(route)});

  const target = ${locator};
  await expect(target).toBeVisible();
  await expect(target).toMatchAriaSnapshot({ name: ${JSON.stringify(baseline)} });
});
`;

const baselineContent = `# Review before accepting this baseline. Keep dynamic/private content out.
- ${role}${name ? ` "${name}"` : ""}
`;

if (!fs.existsSync(testPath)) {
  fs.writeFileSync(testPath, testContent, "utf8");
  console.log(`Created ${testPath}`);
} else {
  console.log(`Skipped existing ${testPath}`);
}

if (!fs.existsSync(baselinePath)) {
  fs.writeFileSync(baselinePath, baselineContent, "utf8");
  console.log(`Created ${baselinePath}`);
} else {
  console.log(`Skipped existing ${baselinePath}`);
}
