// Generate a deterministic Playwright Test spec from a validated web UX plan.
// Every logical step becomes a test.step(); locators are accessible-first.
import { buildLocator, jsString } from "./selectors.mjs";

/**
 * Render a plan string value as a JS expression. Values that are exactly an
 * ${ENV_VAR} reference become a process.env read so secrets never get written
 * into generated spec files. Values that embed ${VAR} become template literals.
 */
export function valueExpr(value) {
  const str = String(value);
  const exact = str.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/);
  if (exact) return `(process.env.${exact[1]} ?? "")`;
  if (/\$\{[A-Za-z_][A-Za-z0-9_]*\}/.test(str)) {
    const tpl = str.replace(/`/g, "\\`").replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, "${process.env.$1 ?? \"\"}");
    return "`" + tpl + "`";
  }
  return jsString(str);
}

/** Generate the full .spec.ts source for a plan. */
export function generateSpec(plan) {
  const lines = [];
  const title = plan.title ?? plan.id;
  const env = plan.environment ?? {};
  const baseUrl = env.base_url ?? "";

  lines.push(`// AUTO-GENERATED from web UX plan "${plan.id}". Edit the plan, not this file.`);
  lines.push(`import { test, expect } from "@playwright/test";`);
  lines.push("");

  // storageState wiring is handled in playwright.config.ts via projects; here we
  // only document the expectation when auth uses storage_state.
  if (env.auth?.strategy === "storage_state" && env.auth.storage_state_path) {
    lines.push(`// Auth: relies on storageState at ${env.auth.storage_state_path} (configure in playwright.config.ts).`);
  }

  lines.push(`test(${jsString(title)}, async ({ page }) => {`);
  if (plan.preconditions?.length) {
    lines.push(`  // Preconditions:`);
    for (const p of plan.preconditions) lines.push(`  //  - ${String(p).replace(/\n/g, " ")}`);
  }

  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const assertions = Array.isArray(plan.assertions) ? plan.assertions : [];
  for (const step of [...steps, ...assertions]) {
    emitStep(lines, step, baseUrl);
  }

  lines.push(`});`);

  if (plan.cleanup?.length) {
    lines.push("");
    lines.push(`test.afterEach(async ({ page }) => {`);
    for (const step of plan.cleanup) emitStep(lines, step, baseUrl);
    lines.push(`});`);
  }

  lines.push("");
  return lines.join("\n");
}

function emitStep(lines, step, baseUrl) {
  const label = step.title ?? `${step.action} ${step.id ?? ""}`.trim();
  if (step.needs_discovery) {
    lines.push(`  // TODO(discovery): resolve selector for step "${step.id}" before running.`);
  }
  lines.push(`  await test.step(${jsString(label)}, async () => {`);
  try {
    for (const body of stepBody(step, baseUrl)) lines.push(`    ${body}`);
  } catch (err) {
    lines.push(`    throw new Error(${jsString(`Cannot generate step ${step.id}: ${err.message}`)});`);
  }
  lines.push(`  });`);
}

function withTimeout(step, opts = {}) {
  const merged = { ...opts };
  if (Number.isInteger(step.timeout_ms)) merged.timeout = step.timeout_ms;
  const keys = Object.keys(merged);
  if (!keys.length) return "";
  return `, { ${keys.map((k) => `${k}: ${typeof merged[k] === "string" ? jsString(merged[k]) : merged[k]}`).join(", ")} }`;
}

function loc(step) {
  return buildLocator(step.target);
}

function* stepBody(step, baseUrl) {
  const optional = step.optional === true;
  const guardOpen = optional ? "try { " : "";
  const guardClose = optional ? " } catch (e) { /* optional step */ }" : "";

  switch (step.action) {
    case "navigate": {
      const url = resolveUrl(step.url, baseUrl);
      yield `${guardOpen}await page.goto(${valueExpr(url)})${guardClose}`;
      return;
    }
    case "click":
      yield `${guardOpen}await ${loc(step)}.click(${stripComma(withTimeout(step))})${guardClose}`;
      return;
    case "dblclick":
      yield `${guardOpen}await ${loc(step)}.dblclick(${stripComma(withTimeout(step))})${guardClose}`;
      return;
    case "fill":
      yield `${guardOpen}await ${loc(step)}.fill(${valueExpr(step.value)})${guardClose}`;
      return;
    case "select":
      yield `${guardOpen}await ${loc(step)}.selectOption(${valueExpr(step.value)})${guardClose}`;
      return;
    case "check":
      yield `${guardOpen}await ${loc(step)}.check()${guardClose}`;
      return;
    case "uncheck":
      yield `${guardOpen}await ${loc(step)}.uncheck()${guardClose}`;
      return;
    case "hover":
      yield `${guardOpen}await ${loc(step)}.hover()${guardClose}`;
      return;
    case "press":
      yield `${guardOpen}await ${loc(step)}.press(${valueExpr(step.value)})${guardClose}`;
      return;
    case "upload":
      yield `${guardOpen}await ${loc(step)}.setInputFiles(${valueExpr(step.value)})${guardClose}`;
      return;
    case "wait_for": {
      const state = step.state ?? "visible";
      yield `${guardOpen}await ${loc(step)}.waitFor({ state: ${jsString(state)}${
        Number.isInteger(step.timeout_ms) ? `, timeout: ${step.timeout_ms}` : ""
      } })${guardClose}`;
      return;
    }
    case "assert_visible":
      yield `await expect(${loc(step)}).toBeVisible(${stripComma(withTimeout(step))})`;
      return;
    case "assert_hidden":
      yield `await expect(${loc(step)}).toBeHidden(${stripComma(withTimeout(step))})`;
      return;
    case "assert_text":
      yield `await expect(${loc(step)}).toContainText(${valueExpr(step.value)})`;
      return;
    case "assert_value":
      yield `await expect(${loc(step)}).toHaveValue(${valueExpr(step.value)})`;
      return;
    case "assert_count":
      yield `await expect(${loc(step)}).toHaveCount(${Number(step.value)})`;
      return;
    case "assert_url": {
      const expected = step.url ?? step.value;
      yield `await expect(page).toHaveURL(${valueExpr(expected)})`;
      return;
    }
    case "capture": {
      const name = String(step.value ?? step.id ?? "capture").replace(/[^a-z0-9._-]/gi, "-");
      yield `await page.screenshot({ path: ${jsString(`${name}.png`)}, fullPage: true }).catch(() => {})`;
      return;
    }
    default:
      throw new Error(`unsupported action "${step.action}"`);
  }
}

function stripComma(s) {
  return s.startsWith(", ") ? s.slice(2) : s;
}

function resolveUrl(url, baseUrl) {
  if (!url) return baseUrl;
  if (/^https?:\/\//.test(url)) return url;
  return url; // relative path; playwright baseURL resolves it
}
