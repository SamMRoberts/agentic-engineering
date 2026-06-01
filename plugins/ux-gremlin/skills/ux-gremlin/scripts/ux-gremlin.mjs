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
const defaultReportDir = ".agent/reports/ux-gremlin";

const allowedModes = new Set(["playwright_cli", "playwright_mcp", "agent_browser", "manual_checklist"]);
const allowedRiskLevels = new Set(["low", "medium", "high", "critical"]);
const allowedResultStatuses = new Set(["passed", "failed", "blocked", "not_run", "needs_review"]);
const allowedResultSeverities = new Set(["info", "low", "medium", "high", "critical"]);
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
  out(`Usage: node skills/ux-gremlin/scripts/ux-gremlin.mjs <command> [--plan <path>] [--results <path>] [--out-dir <path>]

Commands:
  init                 Create .agent/session/ux-gremlin-plan.yaml and report dir if missing.
  check                Validate a UX Gremlin plan.
  summary              Print a concise markdown summary.
  generate-playwright  Generate .agent/generated/ux-gremlin.spec.ts.
  report               Create or update report.md, report.json, and report.html.

Plan discovery defaults to ${defaultYamlPlan}, then ${defaultJsonPlan}.
Report output defaults to reporting.output_dir, then ${defaultReportDir}.
YAML support is intentionally conservative and supports the template shape used by this plugin.
JSON is supported as a fallback at ${defaultJsonPlan}.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { command: argv[2], plan: null, results: null, outDir: null };
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--plan") {
      args.plan = argv[++i];
      if (!args.plan) {
        console.error("ERROR: --plan requires a path");
        usage(2);
      }
    } else if (arg === "--results") {
      args.results = argv[++i];
      if (!args.results) {
        console.error("ERROR: --results requires a path");
        usage(2);
      }
    } else if (arg === "--out-dir") {
      args.outDir = argv[++i];
      if (!args.outDir) {
        console.error("ERROR: --out-dir requires a path");
        usage(2);
      }
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

function looksLikeInlineKeyValue(text) {
  if (text.startsWith(`"`) || text.startsWith(`'`)) return false;
  const idx = text.indexOf(":");
  if (idx <= 0) return false;
  const key = text.slice(0, idx).trim();
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key);
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
      } else if (looksLikeInlineKeyValue(rest)) {
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

function readResults(resultsPath) {
  if (!resultsPath) return null;
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`results file is missing: ${resultsPath}`);
  }
  const source = fs.readFileSync(resultsPath, "utf-8");
  if (resultsPath.endsWith(".json")) return JSON.parse(source);
  return parseYaml(source);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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

function validateResults(results, plan) {
  const errors = [];
  if (!results || typeof results !== "object" || Array.isArray(results)) {
    return ["results must be an object"];
  }
  if (!isNonEmptyString(results.version)) errors.push("results.version is required");
  if (!results.run || typeof results.run !== "object" || Array.isArray(results.run)) {
    errors.push("results.run must be an object");
  }
  if (!hasItems(results.scenario_results)) {
    errors.push("results.scenario_results must include at least one item");
  } else {
    const planScenarioIds = new Set((plan.gremlin_scenarios ?? []).map((scenario) => scenario.id).filter(Boolean));
    results.scenario_results.forEach((result, index) => {
      const label = result?.scenario_id ? `scenario result ${result.scenario_id}` : `scenario result at index ${index}`;
      if (!isNonEmptyString(result?.scenario_id)) errors.push(`${label} is missing scenario_id`);
      if (!allowedResultStatuses.has(result?.status)) {
        errors.push(`${label} status must be one of: ${[...allowedResultStatuses].join(", ")}`);
      }
      if (result?.severity != null && result.severity !== "" && !allowedResultSeverities.has(result.severity)) {
        errors.push(`${label} severity must be one of: ${[...allowedResultSeverities].join(", ")}`);
      }
      if (result?.scenario_id && planScenarioIds.size > 0 && !planScenarioIds.has(result.scenario_id)) {
        errors.push(`${label} does not match any plan scenario`);
      }
      for (const field of [
        "findings",
        "suspected_bugs",
        "accessibility_issues",
        "console_errors",
        "screenshots",
        "traces",
        "recovery_notes",
        "executed_commands",
        "open_risks"
      ]) {
        if (result?.[field] != null && !isStringArray(result[field])) {
          errors.push(`${label}.${field} must be an array of strings when provided`);
        }
      }
    });
  }
  for (const field of ["executed_commands", "open_risks"]) {
    if (results[field] != null && !isStringArray(results[field])) {
      errors.push(`results.${field} must be an array of strings when provided`);
    }
  }
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

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => item != null && String(item).trim() !== "") : [];
}

function stringOrEmpty(value) {
  return value == null ? "" : String(value);
}

function formatList(items, fallback) {
  const lines = asArray(items).map((item) => `- ${item}`);
  return lines.length > 0 ? lines.join("\n") : fallback;
}

function incrementCount(counts, key) {
  const normalized = key || "unknown";
  counts[normalized] = (counts[normalized] ?? 0) + 1;
}

function buildArtifactPaths(outDir) {
  return {
    markdown: path.join(outDir, "report.md"),
    json: path.join(outDir, "report.json"),
    html: path.join(outDir, "report.html")
  };
}

function resolveReportDir(plan, outDirArg) {
  return path.resolve(outDirArg || plan.reporting?.output_dir || defaultReportDir);
}

function normalizeReport(plan, results, outDir) {
  const resultByScenario = new Map((results?.scenario_results ?? []).map((result) => [result.scenario_id, result]));
  const scenarios = (plan.gremlin_scenarios ?? []).map((scenario) => {
    const result = resultByScenario.get(scenario.id) ?? {};
    const status = result.status || "not_run";
    const severity = result.severity || (results ? "info" : scenario.risk_level || "info");
    return {
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      risk_level: scenario.risk_level,
      status,
      severity,
      purpose: scenario.purpose || "",
      expected_behavior: scenario.expected_behavior || "",
      expected_recovery: scenario.recovery_expectation || "",
      outcome: result.outcome || (results ? "No outcome recorded." : "Pending execution."),
      findings: asArray(result.findings),
      suspected_bugs: asArray(result.suspected_bugs),
      accessibility_issues: asArray(result.accessibility_issues),
      console_errors: asArray(result.console_errors),
      screenshots: asArray(result.screenshots),
      traces: asArray(result.traces),
      recovery_notes: asArray(result.recovery_notes),
      executed_commands: asArray(result.executed_commands),
      open_risks: asArray(result.open_risks)
    };
  });

  const status_counts = {};
  const severity_counts = {};
  const category_counts = {};
  for (const scenario of scenarios) {
    incrementCount(status_counts, scenario.status);
    incrementCount(severity_counts, scenario.severity);
    incrementCount(category_counts, scenario.category);
  }

  const artifactPaths = buildArtifactPaths(outDir);
  const globalCommands = [
    ...asArray(results?.executed_commands),
    ...scenarios.flatMap((scenario) => scenario.executed_commands)
  ];
  const globalRisks = [
    ...asArray(results?.open_risks),
    ...scenarios.flatMap((scenario) => scenario.open_risks)
  ];

  return {
    generated_at: new Date().toISOString(),
    source: {
      has_results: Boolean(results),
      results_version: results?.version || null
    },
    plan: {
      version: plan.version || "",
      name: plan.name || "",
      target: {
        url: plan.target?.url || "",
        app_area: plan.target?.app_area || "",
        environment: plan.target?.environment || ""
      },
      mode: plan.mode || "",
      safety: {
        destructive_actions_allowed: plan.safety?.destructive_actions_allowed === true,
        test_data_prefix: plan.safety?.test_data_prefix || "",
        cleanup_required: plan.safety?.cleanup_required === true,
        notes: plan.safety?.notes || ""
      }
    },
    run: {
      executed_at: results?.run?.executed_at || "",
      executor: results?.run?.executor || "",
      environment: results?.run?.environment || "",
      mode: results?.run?.mode || plan.mode || "",
      notes: results?.run?.notes || ""
    },
    baseline_flow: {
      name: plan.baseline_flow?.name || "",
      steps: asArray(plan.baseline_flow?.steps),
      expected_result: plan.baseline_flow?.expected_result || ""
    },
    summary: {
      scenario_count: scenarios.length,
      status_counts,
      severity_counts,
      category_counts,
      finding_count: scenarios.reduce((sum, scenario) => sum + scenario.findings.length, 0),
      suspected_bug_count: scenarios.reduce((sum, scenario) => sum + scenario.suspected_bugs.length, 0),
      accessibility_issue_count: scenarios.reduce((sum, scenario) => sum + scenario.accessibility_issues.length, 0),
      console_error_count: scenarios.reduce((sum, scenario) => sum + scenario.console_errors.length, 0)
    },
    scenarios,
    evidence: {
      screenshots: scenarios.flatMap((scenario) => scenario.screenshots),
      traces: scenarios.flatMap((scenario) => scenario.traces)
    },
    executed_commands: [...new Set(globalCommands)],
    verification_commands: asArray(plan.verification_commands),
    recovery_expectations: asArray(plan.recovery_expectations),
    open_risks: [...new Set(globalRisks)],
    artifacts: {
      markdown: artifactPaths.markdown,
      json: artifactPaths.json,
      html: artifactPaths.html
    }
  };
}

function renderMarkdownReport(report) {
  const scenarioLines = report.scenarios.map((scenario) => {
    return `- ${scenario.id}: ${scenario.name} (${scenario.category}, risk=${scenario.risk_level}, status=${scenario.status}, severity=${scenario.severity})`;
  });
  const scenarioDetails = report.scenarios.map((scenario) => `### ${scenario.id}: ${scenario.name}

- Category: ${scenario.category}
- Planned risk: ${scenario.risk_level}
- Status: ${scenario.status}
- Severity: ${scenario.severity}
- Outcome: ${scenario.outcome}
- Expected behavior: ${scenario.expected_behavior}
- Expected recovery: ${scenario.expected_recovery}

Findings:
${formatList(scenario.findings, "- None recorded.")}

Suspected Bugs:
${formatList(scenario.suspected_bugs, "- None recorded.")}

Accessibility Issues:
${formatList(scenario.accessibility_issues, "- None recorded.")}

Console Errors:
${formatList(scenario.console_errors, "- None recorded.")}

Evidence:
${formatList([...scenario.screenshots, ...scenario.traces], "- None recorded.")}

Recovery Notes:
${formatList(scenario.recovery_notes, "- Pending execution.")}
`).join("\n");

  const allFindings = report.scenarios.flatMap((scenario) => scenario.findings.map((item) => `${scenario.id}: ${item}`));
  const allBugs = report.scenarios.flatMap((scenario) => scenario.suspected_bugs.map((item) => `${scenario.id}: ${item}`));
  const allAccessibility = report.scenarios.flatMap((scenario) => scenario.accessibility_issues.map((item) => `${scenario.id}: ${item}`));
  const allConsoleErrors = report.scenarios.flatMap((scenario) => scenario.console_errors.map((item) => `${scenario.id}: ${item}`));

  return `# UX Gremlin Report

## Target

- Name: ${report.plan.name}
- URL: ${report.plan.target.url}
- App area: ${report.plan.target.app_area}
- Environment: ${report.plan.target.environment}
- Mode: ${report.plan.mode}
- Results included: ${report.source.has_results}

## Baseline Flow

${report.baseline_flow.steps.map((step, index) => `${index + 1}. ${step}`).join("\n") || "No baseline steps recorded."}

Expected result: ${report.baseline_flow.expected_result}

## Scenario Rollup

- Total scenarios: ${report.summary.scenario_count}
- Status counts: ${JSON.stringify(report.summary.status_counts)}
- Severity counts: ${JSON.stringify(report.summary.severity_counts)}
- Category counts: ${JSON.stringify(report.summary.category_counts)}

## Scenarios Tested

${scenarioLines.join("\n") || "No scenarios recorded."}

${scenarioDetails || "No scenario details recorded."}

## Findings

${formatList(allFindings, "- Pending execution.")}

## Bugs Suspected

${formatList(allBugs, "- Pending execution.")}

## Accessibility Issues

${formatList(allAccessibility, "- Pending keyboard, focus, ARIA, and screen-reader validation.")}

## Console Errors

${formatList(allConsoleErrors, "- Pending execution.")}

## Screenshots / Traces

- Output directory: ${path.dirname(report.artifacts.markdown)}
${formatList([...report.evidence.screenshots, ...report.evidence.traces], "- Pending execution.")}

## Recovery Behavior

${formatList(report.scenarios.flatMap((scenario) => scenario.recovery_notes), formatList(report.recovery_expectations, "- Pending execution."))}

## Follow-up Tests

${formatList(report.verification_commands, "- Add verification commands.")}

## Executed Commands

${formatList(report.executed_commands, "- Pending execution.")}

## Open Risks

- Selectors and app-specific data must be confirmed before executing generated Playwright.
${formatList(report.open_risks, "- No result-specific risks recorded.")}
- Destructive actions allowed: ${report.plan.safety.destructive_actions_allowed}
`;
}

function escapeHtml(value) {
  return stringOrEmpty(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlList(items, fallback) {
  const values = asArray(items);
  if (values.length === 0) return `<p>${escapeHtml(fallback)}</p>`;
  return `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderHtmlReport(report) {
  const scenarioSections = report.scenarios.map((scenario) => `<section>
    <h3>${escapeHtml(`${scenario.id}: ${scenario.name}`)}</h3>
    <dl>
      <dt>Category</dt><dd>${escapeHtml(scenario.category)}</dd>
      <dt>Planned risk</dt><dd>${escapeHtml(scenario.risk_level)}</dd>
      <dt>Status</dt><dd>${escapeHtml(scenario.status)}</dd>
      <dt>Severity</dt><dd>${escapeHtml(scenario.severity)}</dd>
      <dt>Outcome</dt><dd>${escapeHtml(scenario.outcome)}</dd>
    </dl>
    <h4>Findings</h4>${htmlList(scenario.findings, "None recorded.")}
    <h4>Suspected Bugs</h4>${htmlList(scenario.suspected_bugs, "None recorded.")}
    <h4>Accessibility Issues</h4>${htmlList(scenario.accessibility_issues, "None recorded.")}
    <h4>Console Errors</h4>${htmlList(scenario.console_errors, "None recorded.")}
    <h4>Evidence</h4>${htmlList([...scenario.screenshots, ...scenario.traces], "None recorded.")}
    <h4>Recovery Notes</h4>${htmlList(scenario.recovery_notes, "Pending execution.")}
  </section>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(report.plan.name || "UX Gremlin Report")}</title>
  <style>
    body { color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; margin: 2rem auto; max-width: 980px; padding: 0 1rem; }
    h1, h2, h3 { color: #111827; }
    section { border-top: 1px solid #d1d5db; padding: 1rem 0; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
    dt { font-weight: 700; }
    code, pre { background: #f3f4f6; border-radius: 4px; padding: 0.1rem 0.25rem; }
  </style>
</head>
<body>
  <h1>UX Gremlin Report</h1>
  <section>
    <h2>Target</h2>
    <dl>
      <dt>Name</dt><dd>${escapeHtml(report.plan.name)}</dd>
      <dt>URL</dt><dd>${escapeHtml(report.plan.target.url)}</dd>
      <dt>App area</dt><dd>${escapeHtml(report.plan.target.app_area)}</dd>
      <dt>Environment</dt><dd>${escapeHtml(report.plan.target.environment)}</dd>
      <dt>Mode</dt><dd>${escapeHtml(report.plan.mode)}</dd>
      <dt>Results included</dt><dd>${escapeHtml(report.source.has_results)}</dd>
    </dl>
  </section>
  <section>
    <h2>Scenario Rollup</h2>
    <p>Total scenarios: ${escapeHtml(report.summary.scenario_count)}</p>
    <p>Status counts: <code>${escapeHtml(JSON.stringify(report.summary.status_counts))}</code></p>
    <p>Severity counts: <code>${escapeHtml(JSON.stringify(report.summary.severity_counts))}</code></p>
    <p>Category counts: <code>${escapeHtml(JSON.stringify(report.summary.category_counts))}</code></p>
  </section>
  <section>
    <h2>Baseline Flow</h2>
    ${htmlList(report.baseline_flow.steps.map((step, index) => `${index + 1}. ${step}`), "No baseline steps recorded.")}
    <p>Expected result: ${escapeHtml(report.baseline_flow.expected_result)}</p>
  </section>
  <section>
    <h2>Scenarios Tested</h2>
    ${scenarioSections || "<p>No scenario details recorded.</p>"}
  </section>
  <section>
    <h2>Executed Commands</h2>
    ${htmlList(report.executed_commands, "Pending execution.")}
  </section>
  <section>
    <h2>Open Risks</h2>
    ${htmlList(report.open_risks, "No result-specific risks recorded.")}
  </section>
</body>
</html>
`;
}

function commandReport(planPath, resultsPath, outDirArg) {
  const plan = readPlan(planPath);
  const planErrors = validatePlan(plan);
  if (planErrors.length > 0) {
    printErrors(planErrors);
    process.exit(1);
  }
  const results = readResults(resultsPath);
  if (results) {
    const resultErrors = validateResults(results, plan);
    if (resultErrors.length > 0) {
      printErrors(resultErrors);
      process.exit(1);
    }
  }
  const outDir = resolveReportDir(plan, outDirArg);
  ensureDir(outDir);
  const report = normalizeReport(plan, results, outDir);
  const artifacts = buildArtifactPaths(outDir);
  fs.writeFileSync(artifacts.markdown, renderMarkdownReport(report), "utf-8");
  fs.writeFileSync(artifacts.json, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  fs.writeFileSync(artifacts.html, renderHtmlReport(report), "utf-8");
  console.log(`Wrote ${artifacts.markdown}`);
  console.log(`Wrote ${artifacts.json}`);
  console.log(`Wrote ${artifacts.html}`);
}

const args = parseArgs(process.argv);
const planPath = resolvePlanPath(args.plan);

try {
  if (args.command === "init") commandInit();
  else if (args.command === "check") commandCheck(planPath);
  else if (args.command === "summary") commandSummary(planPath);
  else if (args.command === "generate-playwright") commandGeneratePlaywright(planPath);
  else if (args.command === "report") commandReport(planPath, args.results ? path.resolve(args.results) : null, args.outDir);
  else usage(2);
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
