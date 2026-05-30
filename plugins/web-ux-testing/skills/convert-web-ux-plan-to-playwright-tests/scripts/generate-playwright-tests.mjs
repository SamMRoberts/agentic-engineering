#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { collectScenarios } from "../../../lib/plan-lint.mjs";
import { readYamlFile } from "../../../lib/yaml-utils.mjs";
import { validatePlan } from "../../../lib/plan-validation.mjs";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function stringLiteral(value) {
  return JSON.stringify(value ?? "");
}

function safeFileName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function locatorExpression(locator) {
  if (!locator) {
    throw new Error("Executable step requires a locator.");
  }

  switch (locator.strategy) {
    case "role":
      return locator.name
        ? `page.getByRole(${stringLiteral(locator.role)}, { name: ${stringLiteral(locator.name)} })`
        : `page.getByRole(${stringLiteral(locator.role)})`;
    case "label":
      return `page.getByLabel(${stringLiteral(locator.value)})`;
    case "text":
      return `page.getByText(${stringLiteral(locator.value)})`;
    case "test_id":
      return `page.getByTestId(${stringLiteral(locator.value)})`;
    case "placeholder":
      return `page.getByPlaceholder(${stringLiteral(locator.value)})`;
    case "css":
      return `page.locator(${stringLiteral(locator.value)})`;
    default:
      throw new Error(`Unsupported locator strategy: ${locator.strategy}`);
  }
}

function compileStep(step) {
  switch (step.action) {
    case "navigate":
      return `await page.goto(${stringLiteral(step.path)});`;
    case "click":
      return `await ${locatorExpression(step.locator)}.click();`;
    case "fill":
      return `await ${locatorExpression(step.locator)}.fill(${stringLiteral(step.value)});`;
    case "select":
      return `await ${locatorExpression(step.locator)}.selectOption(${stringLiteral(step.value)});`;
    case "press":
      return `await ${locatorExpression(step.locator)}.press(${stringLiteral(step.key)});`;
    case "assert_visible":
      return `await expect(${locatorExpression(step.locator)}).toBeVisible();`;
    case "assert_text":
      return `await expect(${locatorExpression(step.locator)}).toContainText(${stringLiteral(step.expected)});`;
    case "assert_url":
      return `await expect(page).toHaveURL(new RegExp(${stringLiteral(step.expected)}));`;
    case "capture_evidence":
      return `await page.screenshot({ path: ${stringLiteral(step.value ?? "web-ux-evidence.png")}, fullPage: true });`;
    default:
      throw new Error(`Unsupported executable step action: ${step.action}`);
  }
}

function compileScenario(scenario) {
  const lines = scenario.executable_steps.map((step) => `    ${compileStep(step)}`);

  return `import { test, expect } from "@playwright/test";

test.describe("web UX regression", () => {
  test(${stringLiteral(`${scenario.id}: ${scenario.title}`)}, async ({ page }) => {
${lines.join("\n")}
  });
});
`;
}

export function generatePlaywrightTestsFromPlan(plan, options = {}) {
  const outDir = path.resolve(options.outDir ?? "tests/web-ux");
  const validation = validatePlan(plan);

  if (validation.errors.length > 0) {
    return { generated: [], errors: validation.errors, warnings: validation.warnings };
  }

  const generated = [];

  for (const { scenario } of collectScenarios(plan)) {
    if (!scenario.convert_to_regression_test || !scenario.executable_steps?.length) {
      continue;
    }

    const filePath = path.join(outDir, `${safeFileName(scenario.id)}.spec.ts`);
    const code = compileScenario(scenario);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, code, "utf8");
    generated.push({ scenarioId: scenario.id, filePath });
  }

  return { generated, errors: [], warnings: validation.warnings };
}

export function generatePlaywrightTestsFromPlanFile(planPath, options = {}) {
  const plan = readYamlFile(path.resolve(planPath));
  return generatePlaywrightTestsFromPlan(plan, options);
}

function runCli() {
  const planPath = arg("plan", process.argv[2]);
  const outDir = arg("out", "tests/web-ux");

  if (!planPath) {
    console.error("Usage: node skills/convert-web-ux-plan-to-playwright-tests/scripts/generate-playwright-tests.mjs --plan <path-to-plan.yaml> [--out tests/web-ux]");
    process.exit(2);
  }

  const result = generatePlaywrightTestsFromPlanFile(planPath, { outDir });

  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }

  for (const error of result.errors) {
    console.error(`ERROR: ${error}`);
  }

  if (result.errors.length > 0) {
    process.exit(1);
  }

  for (const generated of result.generated) {
    console.log(`Generated ${generated.filePath}`);
  }

  if (result.generated.length === 0) {
    console.log("No executable regression scenarios found.");
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  runCli();
}