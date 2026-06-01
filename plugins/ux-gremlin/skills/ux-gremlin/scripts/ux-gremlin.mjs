#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, "..");
const defaultYamlPlan = ".agent/session/ux-gremlin-plan.yaml";
const defaultJsonPlan = ".agent/session/ux-gremlin-plan.json";
const templatePath = path.join(skillDir, "templates", "ux-gremlin-plan.yaml");
const outputSpecPath = ".agent/generated/ux-gremlin.spec.ts";
const outputReportPath = ".agent/reports/ux-gremlin/report.md";

const allowedModes = new Set(["playwright_cli", "playwright_mcp", "agent_browser", "manual_checklist"]);
const allowedRiskLevels = new Set(["low", "medium", "high", "critical"]);
const allowedCategories = new Set([
  "double_submit",
  "rapid_clicking",
  "keyboard_only",
  "screen_reader_semantics",
  "browser_back_forward",
  "reload_mid_flow",
  "modal_escape",
  "tab_switching",
  "slow_network",
  "offline_recovery",
  "stale_cache",
  "expired_auth",
  "permission_denied",
  "invalid_required_fields",
  "partial_form_completion",
  "duplicate_entity_creation",
  "deep_link_entry",
  "interrupted_save",
  "concurrent_edit",
  "viewport_resize",
  "mobile_touch",
  "session_storage_clear",
  "local_storage_clear",
  "cookie_clear",
  "unexpected_navigation",
  "long_running_operation"
]);

function usage(exitCode = 2) {
  const out = exitCode === 0 ? console.log : console.error;
  out(`Usage: node skills/ux-gremlin/scripts/ux-gremlin.mjs <command> [--plan <path>]

Commands:
  init                 Create .agent/session/ux-gremlin-plan.yaml and report dir if missing.
  check                Validate a UX Gremlin plan.
  summary              Print a concise markdown summary.
  generate-playwright  Generate .agent/generated/ux-gremlin.spec.ts.
  report               Create or update .agent/reports/ux-gremlin/report.md.

Plan discovery defaults to ${defaultYamlPlan}, then ${defaultJsonPlan}.
YAML support is intentionally conservative and supports the template shape used by this plugin.
JSON is supported as a fallback at ${defaultJsonPlan}.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { command: argv[2], plan: null };
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--plan") {
      args.plan = argv[++i];
    } else if (arg === "-h" || arg === "--help") {
      usage(0);
    } else {
      console.error(`ERROR: unknown argument ${arg}`);
      usage(2);
    }
  }
  if (!args.command) usage(2);
  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolvePlanPath(planArg) {
  if (planArg) return path.resolve(planArg);
  const yaml = path.resolve(defaultYamlPlan);
  if (fs.existsSync(yaml)) return yaml;
  const json = path.resolve(defaultJsonPlan);
  if (fs.existsSync(json)) return json;
  return yaml;
}

function stripInlineComment(line) {
  let inQuote = false;
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ((ch === `"` || ch === `'`) && line[i - 1] !== "\\") {
      if (!inQuote) {
        inQuote = true;
        quote = ch;
      } else if (quote === ch) {
        inQuote = false;
        quote = "";
      }
    }
    if (ch === "#" && !inQuote && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

function tokenizeYaml(source) {
  return source
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: stripInlineComment(raw), line: index + 1 }))
    .filter((entry) => entry.raw.trim() !== "")
    .map((entry) => ({
      ...entry,
      indent: entry.raw.match(/^ */)[0].length,
      text: entry.raw.trim()
    }));
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if ((trimmed.startsWith(`"`) && trimmed.endsWith(`"`)) || (trimmed.startsWith(`'`) && trimmed.endsWith(`'`))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => parseScalar(part.trim()));
  }
  return trimmed;
}

function splitKeyValue(text, line) {
  const idx = text.indexOf(":");
  if (idx === -1) throw new Error(`line ${line}: expected key/value pair`);
  return [text.slice(0, idx).trim(), text.slice(idx + 1).trim()];
}

function parseYaml(source) {
  const tokens = tokenizeYaml(source);
  if (tokens.length === 0) return {};

  function parseBlock(index, indent) {
    if (index >= tokens.length) return [{}, index];
    if (tokens[index].indent < indent) return [{}, index];
    if (tokens[index].text.startsWith("- ")) return parseSequence(index, indent);
    return parseMapping(index, indent);
  }

  function parseMapping(index, indent, seed = {}) {
    const obj = seed;
    while (index < tokens.length) {
      const token = tokens[index];
      if (token.indent < indent) break;
      if (token.indent > indent) throw new Error(`line ${token.line}: unexpected indentation`);
      if (token.text.startsWith("- ")) break;
      const [key, rawValue] = splitKeyValue(token.text, token.line);
      if (!key) throw new Error(`line ${token.line}: empty key`);
      index += 1;
      if (rawValue === "") {
        if (index < tokens.length && tokens[index].indent > indent) {
          const [value, nextIndex] = parseBlock(index, tokens[index].indent);
          obj[key] = value;
          index = nextIndex;
        } else {
          obj[key] = {};
        }
      } else {
        obj[key] = parseScalar(rawValue);
      }
    }
    return [obj, index];
  }

  function parseSequence(index, indent) {
    const arr = [];
    while (index < tokens.length) {
      const token = tokens[index];
      if (token.indent < indent) break;
      if (token.indent > indent) throw new Error(`line ${token.line}: unexpected indentation`);
      if (!token.text.startsWith("- ")) break;
      const rest = token.text.slice(2).trim();
      index += 1;
      if (rest === "") {
        if (index < tokens.length && tokens[index].indent > indent) {
          const [value, nextIndex] = parseBlock(index, tokens[index].indent);
          arr.push(value);
          index = nextIndex;
        } else {
          arr.push(null);
        }
      } else if (rest.includes(":")) {
        const [key, rawValue] = splitKeyValue(rest, token.line);
        const item = {};
        item[key] = rawValue === "" ? {} : parseScalar(rawValue);
        if (index < tokens.length && tokens[index].indent > indent) {
          const [value, nextIndex] = parseMapping(index, tokens[index].indent, item);
          arr.push(value);
          index = nextIndex;
        } else {
          arr.push(item);
        }
      } else {
        arr.push(parseScalar(rest));
      }
    }
    return [arr, index];
  }

  const [doc, nextIndex] = parseBlock(0, tokens[0].indent);
  if (nextIndex !== tokens.length) {
    throw new Error(`line ${tokens[nextIndex].line}: could not parse remaining YAML`);
  }
  return doc;
}

function readPlan(planPath) {
  if (!fs.existsSync(planPath)) {
    throw new Error(`plan file is missing: ${planPath}`);
  }
  const source = fs.readFileSync(planPath, "utf-8");
  if (planPath.endsWith(".json")) return JSON.parse(source);
  return parseYaml(source);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function validatePlan(plan) {
  const errors = [];
  const requiredTop = [
    "version",
    "name",
    "target",
    "mode",
    "safety",
    "baseline_flow",
    "gremlin_scenarios",
    "accessibility_checks",
    "assertions",
    "bug_indicators",
    "recovery_expectations",
    "verification_commands",
    "reporting"
  ];

  for (const field of requiredTop) {
    if (!(field in plan)) errors.push(`missing required top-level field: ${field}`);
  }

  if (!allowedModes.has(plan.mode)) {
    errors.push(`mode must be one of: ${[...allowedModes].join(", ")}`);
  }
  if (!plan.target || typeof plan.target !== "object") {
    errors.push("target must be an object");
  } else if (!isNonEmptyString(plan.target.url) && !isNonEmptyString(plan.target.app_area)) {
    errors.push("target.url or target.app_area must be provided");
  }
  if (!plan.safety || typeof plan.safety !== "object") {
    errors.push("safety must be an object");
  } else if (plan.safety.destructive_actions_allowed === true && !isNonEmptyString(plan.safety.notes)) {
    errors.push("destructive actions are enabled without explicit safety notes");
  }
  if (!plan.baseline_flow || typeof plan.baseline_flow !== "object") {
    errors.push("baseline_flow must be an object");
  } else {
    if (!isNonEmptyString(plan.baseline_flow.name)) errors.push("baseline_flow.name is required");
    if (!hasItems(plan.baseline_flow.steps)) errors.push("baseline flow has no steps");
    if (!isNonEmptyString(plan.baseline_flow.expected_result)) errors.push("baseline_flow.expected_result is required");
  }
  if (!hasItems(plan.gremlin_scenarios)) {
    errors.push("no gremlin scenarios are defined");
  } else {
    plan.gremlin_scenarios.forEach((scenario, index) => {
      const label = scenario?.id ? `scenario ${scenario.id}` : `scenario at index ${index}`;
      for (const field of ["id", "name", "category", "risk_level", "purpose", "steps", "expected_behavior", "assertions", "recovery_expectation"]) {
        if (!(field in scenario) || scenario[field] === "" || scenario[field] == null) {
          errors.push(`${label} is missing ${field}`);
        }
      }
      if (!allowedCategories.has(scenario.category)) {
        errors.push(`${label} has invalid category: ${scenario.category}`);
      }
      if (!allowedRiskLevels.has(scenario.risk_level)) {
        errors.push(`${label} has invalid risk_level: ${scenario.risk_level}`);
      }
      if (!hasItems(scenario.assertions)) {
        errors.push(`${label} is missing assertions`);
      }
      if (!isNonEmptyString(scenario.recovery_expectation)) {
        errors.push(`${label} is missing recovery expectation`);
      }
      if ((scenario.risk_level === "high" || scenario.risk_level === "critical") && !hasItems(scenario.bug_indicators)) {
        errors.push(`${label} is high risk and must include bug indicators`);
      }
    });
  }
  if (!hasItems(plan.assertions)) errors.push("assertions must include at least one item");
  if (!hasItems(plan.recovery_expectations)) errors.push("recovery_expectations must include at least one item");
  if (!hasItems(plan.verification_commands)) errors.push("verification commands are empty");
  return errors;
}

function printErrors(errors) {
  for (const error of errors) console.error(`ERROR: ${error}`);
}

function commandInit() {
  ensureDir(path.dirname(defaultYamlPlan));
  ensureDir(".agent/reports/ux-gremlin");
  if (!fs.existsSync(defaultYamlPlan)) {
    fs.copyFileSync(templatePath, defaultYamlPlan);
    console.log(`Created ${defaultYamlPlan}`);
  } else {
    console.log(`Exists ${defaultYamlPlan}`);
  }
  console.log("Ready .agent/reports/ux-gremlin");
}

function commandCheck(planPath) {
  let plan;
  try {
    plan = readPlan(planPath);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
  const errors = validatePlan(plan);
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  console.log(`OK: ${planPath}`);
}

function scenarioCategories(plan) {
  return [...new Set((plan.gremlin_scenarios ?? []).map((scenario) => scenario.category).filter(Boolean))];
}

function commandSummary(planPath) {
  const plan = readPlan(planPath);
  const highRisk = (plan.gremlin_scenarios ?? []).filter((scenario) => scenario.risk_level === "high" || scenario.risk_level === "critical");
  console.log(`# UX Gremlin Summary

- Plan: ${plan.name || "(unnamed)"}
- Target URL: ${plan.target?.url || "(not set)"}
- Mode: ${plan.mode || "(not set)"}
- Baseline steps: ${(plan.baseline_flow?.steps ?? []).length}
- Scenario count: ${(plan.gremlin_scenarios ?? []).length}
- Scenario categories: ${scenarioCategories(plan).join(", ") || "(none)"}
- High/critical scenarios: ${highRisk.map((scenario) => scenario.id).join(", ") || "(none)"}
- Accessibility checks: keyboard=${Boolean(plan.accessibility_checks?.keyboard_only)}, focus=${Boolean(plan.accessibility_checks?.focus_management)}, aria=${Boolean(plan.accessibility_checks?.aria_semantics)}
- Verification commands: ${(plan.verification_commands ?? []).join(" ; ") || "(none)"}`);
}

function quoteForComment(value) {
  return String(value ?? "").replace(/\*\//g, "* /");
}

function testName(value) {
  return String(value ?? "scenario").replace(/[`\\]/g, "");
}

function writeGeneratedSpec(plan) {
  ensureDir(path.dirname(outputSpecPath));
  const baselineSteps = (plan.baseline_flow?.steps ?? []).map((step, index) => `    await test.step(${JSON.stringify(`Baseline ${index + 1}: ${step}`)}, async () => {
      // TODO: implement with role-based locators and accessible names.
      // Example: await page.getByRole('button', { name: /add new/i }).click();
    });`).join("\n");

  const scenarioTests = (plan.gremlin_scenarios ?? []).map((scenario) => {
    const steps = (scenario.steps ?? []).map((step, index) => `    await test.step(${JSON.stringify(`${index + 1}. ${step}`)}, async () => {
      // TODO: mutate the baseline flow for category "${scenario.category}".
    });`).join("\n");
    const assertions = (scenario.assertions ?? []).map((assertion) => `    // Assertion: ${quoteForComment(assertion)}`).join("\n");
    return `
  test(${JSON.stringify(`${scenario.id}: ${testName(scenario.name)}`)}, async ({ page }) => {
    test.skip(destructiveActionsAllowed === false && ${JSON.stringify(scenario.risk_level)} === "critical", "Critical/destructive UX paths require explicit safety review.");
    await page.goto(targetUrl);
${steps}
${assertions}
    // Expected behavior: ${quoteForComment(scenario.expected_behavior)}
    // Recovery check: ${quoteForComment(scenario.recovery_expectation)}
    // Accessibility notes: ${quoteForComment(scenario.accessibility_notes)}
    // Playwright notes: ${quoteForComment(scenario.playwright_notes)}
  });`;
  }).join("\n");

  const source = `import { test, expect } from '@playwright/test';

const targetUrl = process.env.UX_GREMLIN_TARGET_URL || ${JSON.stringify(plan.target?.url || "http://localhost:3000")};
const destructiveActionsAllowed = ${plan.safety?.destructive_actions_allowed === true};

test.describe(${JSON.stringify(plan.name || "UX Gremlin Plan")}, () => {
  test('baseline happy path', async ({ page }) => {
    await page.goto(targetUrl);
${baselineSteps || "    // TODO: add baseline happy-path steps."}
    // Expected result: ${quoteForComment(plan.baseline_flow?.expected_result)}
    // TODO: add concrete expect(...) assertions after selectors are known.
    await expect(page).toHaveURL(/./);
  });
${scenarioTests}
});
`;
  fs.writeFileSync(outputSpecPath, source, "utf-8");
  console.log(`Wrote ${outputSpecPath}`);
}

function commandGeneratePlaywright(planPath) {
  const plan = readPlan(planPath);
  const errors = validatePlan(plan);
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  writeGeneratedSpec(plan);
}

function commandReport(planPath) {
  const plan = readPlan(planPath);
  ensureDir(path.dirname(outputReportPath));
  const scenarioLines = (plan.gremlin_scenarios ?? []).map((scenario) => `- ${scenario.id}: ${scenario.name} (${scenario.category}, ${scenario.risk_level})`).join("\n");
  const content = `# UX Gremlin Report

## Target

- Name: ${plan.name || ""}
- URL: ${plan.target?.url || ""}
- App area: ${plan.target?.app_area || ""}
- Environment: ${plan.target?.environment || ""}
- Mode: ${plan.mode || ""}

## Baseline Flow

${(plan.baseline_flow?.steps ?? []).map((step, index) => `${index + 1}. ${step}`).join("\n") || "No baseline steps recorded."}

## Scenarios Tested

${scenarioLines || "No scenarios recorded."}

## Findings

- Pending execution.

## Bugs Suspected

- Pending execution.

## Accessibility Issues

- Pending keyboard, focus, ARIA, and screen-reader validation.

## Console Errors

- Pending execution.

## Screenshots / Traces

- Output directory: ${plan.reporting?.output_dir || ".agent/reports/ux-gremlin"}

## Recovery Behavior

${(plan.recovery_expectations ?? []).map((item) => `- ${item}`).join("\n") || "- Pending execution."}

## Follow-up Tests

${(plan.verification_commands ?? []).map((item) => `- ${item}`).join("\n") || "- Add verification commands."}

## Open Risks

- Selectors and app-specific data must be confirmed before executing generated Playwright.
- Destructive actions allowed: ${plan.safety?.destructive_actions_allowed === true}
`;
  fs.writeFileSync(outputReportPath, content, "utf-8");
  console.log(`Wrote ${outputReportPath}`);
}

const args = parseArgs(process.argv);
const planPath = resolvePlanPath(args.plan);

try {
  if (args.command === "init") commandInit();
  else if (args.command === "check") commandCheck(planPath);
  else if (args.command === "summary") commandSummary(planPath);
  else if (args.command === "generate-playwright") commandGeneratePlaywright(planPath);
  else if (args.command === "report") commandReport(planPath);
  else usage(2);
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
