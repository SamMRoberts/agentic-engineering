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
const defaultIngestOut = ".agent/session/ux-gremlin-results.json";
const defaultEvidenceDir = ".agent/evidence/ux-gremlin";
const baselineTestTitle = "baseline happy path";

const allowedModes = new Set(["playwright_cli", "playwright_mcp", "agent_browser", "manual_checklist"]);
const allowedWorkflowPhases = new Set(["plan", "generate", "execute", "ingest", "report"]);
const allowedRiskLevels = new Set(["low", "medium", "high", "critical"]);
const allowedResultStatuses = new Set(["passed", "failed", "blocked", "not_run", "needs_review"]);
const allowedResultSeverities = new Set(["info", "low", "medium", "high", "critical"]);

// Ordered low -> high so severities can be compared and thresholds applied.
const severityOrder = ["info", "low", "medium", "high", "critical"];
const severityRank = new Map(severityOrder.map((value, index) => [value, index]));
const severityWeights = { info: 0, low: 1, medium: 3, high: 7, critical: 12 };

const allowedFlowTypes = new Set([
  "form",
  "authenticated",
  "long_running",
  "crud",
  "read_only",
  "navigation",
  "generic"
]);

// Each flow type requires one or more category groups. A group is satisfied when
// at least one of its categories is present, so groups express OR and the list
// expresses AND. This mirrors the SKILL.md scenario generation rules.
const flowTypeRequirements = {
  form: [
    ["invalid_required_fields"],
    ["partial_form_completion"],
    ["duplicate_entity_creation"],
    ["interrupted_save"]
  ],
  authenticated: [["expired_auth", "permission_denied"]],
  long_running: [
    ["reload_mid_flow"],
    ["slow_network", "long_running_operation"],
    ["partial_form_completion"]
  ],
  crud: [["duplicate_entity_creation"], ["concurrent_edit"]],
  read_only: [],
  navigation: [["browser_back_forward", "deep_link_entry", "unexpected_navigation"]],
  generic: []
};
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

// Bounded vocabulary for the optional playwright_steps recipe DSL. Selectors
// stay restricted to role+name/label/testid so generated Playwright cannot be
// injected through untrusted strings.
const allowedRecipeActions = new Set([
  "goto",
  "click",
  "fill",
  "press",
  "wait_for_url",
  "expect_visible",
  "expect_text",
  "expect_count",
  "screenshot"
]);

const recipeAssertionActions = new Set(["expect_visible", "expect_text", "expect_count"]);

function usage(exitCode = 2) {
  const out = exitCode === 0 ? console.log : console.error;
  out(`Usage: node scripts/ux-gremlin-core.mjs <command> [options]

Commands:
  init                 Create .agent/session/ux-gremlin-plan.yaml and report dir if missing.
  check                Validate a UX Gremlin plan (includes coverage enforcement).
  coverage             Report flow-type category gaps and declared-condition warnings.
  summary              Print a concise markdown summary.
  workflow-status      Check whether required artifacts are ready for a workflow phase.
  generate-playwright  Generate runnable .agent/generated/ux-gremlin.spec.ts.
  ingest               Convert a Playwright JSON report (+optional axe) into a results file.
  report               Create or update report.md, report.json, report.html, report.junit.xml, and report.pr.md.
  gate                 Exit non-zero when results contain an issue at or above --fail-on severity.

Options:
  --plan <path>        Plan file (defaults to ${defaultYamlPlan}, then ${defaultJsonPlan}).
  --results <path>     Executed results file for report/gate.
  --out-dir <path>     Report output directory (defaults to reporting.output_dir, then ${defaultReportDir}).
  --input <path>       Playwright JSON report consumed by ingest.
  --axe <path>         Optional axe-core JSON consumed by ingest.
  --out <path>         Output results file for ingest (defaults to ${defaultIngestOut}).
  --phase <phase>      Workflow phase for workflow-status: plan|generate|execute|ingest|report.
  --fail-on <severity> Severity gate threshold for report/gate (info|low|medium|high|critical; default high).
  --no-history         Do not read or append run history during report.

YAML support is intentionally conservative and supports the template shape used by this plugin.
JSON is supported as a fallback at ${defaultJsonPlan}.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    command: argv[2],
    plan: null,
    results: null,
    outDir: null,
    input: null,
    axe: null,
    out: null,
    failOn: null,
    phase: null,
    history: true
  };
  const valueFlags = {
    "--plan": "plan",
    "--results": "results",
    "--out-dir": "outDir",
    "--input": "input",
    "--axe": "axe",
    "--out": "out",
    "--fail-on": "failOn",
    "--phase": "phase"
  };
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-history") {
      args.history = false;
    } else if (arg === "-h" || arg === "--help") {
      usage(0);
    } else if (Object.prototype.hasOwnProperty.call(valueFlags, arg)) {
      const value = argv[++i];
      if (!value) {
        console.error(`ERROR: ${arg} requires a value`);
        usage(2);
      }
      args[valueFlags[arg]] = value;
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

function planScenarioCategorySet(plan) {
  return new Set((plan.gremlin_scenarios ?? []).map((scenario) => scenario?.category).filter(Boolean));
}

function normalizeFlowTypes(plan) {
  const raw = plan.flow_type ?? plan.flow_types;
  if (raw == null || raw === "") return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((item) => String(item).trim()).filter(Boolean);
}

function conditionChecks(plan) {
  const data = plan.data_conditions ?? {};
  const network = plan.network_conditions ?? {};
  const state = plan.state_conditions ?? {};
  return [
    {
      label: "network_conditions.include_slow_network",
      active: network.include_slow_network === true,
      categories: ["slow_network", "long_running_operation"]
    },
    {
      label: "network_conditions.include_offline_recovery",
      active: network.include_offline_recovery === true,
      categories: ["offline_recovery"]
    },
    {
      label: "state_conditions.include_stale_cache",
      active: state.include_stale_cache === true,
      categories: ["stale_cache"]
    },
    {
      label: "state_conditions.include_storage_clear",
      active: state.include_storage_clear === true,
      categories: ["session_storage_clear", "local_storage_clear"]
    },
    {
      label: "state_conditions.include_cookie_clear",
      active: state.include_cookie_clear === true,
      categories: ["cookie_clear"]
    },
    {
      label: "data_conditions.invalid_inputs",
      active: hasItems(data.invalid_inputs),
      categories: ["invalid_required_fields"]
    },
    {
      label: "data_conditions.duplicate_inputs",
      active: hasItems(data.duplicate_inputs),
      categories: ["duplicate_entity_creation"]
    },
    {
      label: "data_conditions.boundary_inputs",
      active: hasItems(data.boundary_inputs),
      categories: ["invalid_required_fields", "partial_form_completion"]
    }
  ];
}

function computeCoverage(plan) {
  const present = planScenarioCategorySet(plan);
  const flowTypes = normalizeFlowTypes(plan);
  const invalidFlowTypes = flowTypes.filter((flowType) => !allowedFlowTypes.has(flowType));
  const missing = [];
  for (const flowType of flowTypes) {
    const groups = flowTypeRequirements[flowType];
    if (!groups) continue;
    for (const group of groups) {
      if (!group.some((category) => present.has(category))) {
        missing.push({ flow_type: flowType, expected: group });
      }
    }
  }
  const conditionWarnings = conditionChecks(plan)
    .filter((entry) => entry.active && !entry.categories.some((category) => present.has(category)))
    .map((entry) => ({ condition: entry.label, expected: entry.categories }));

  // authentication.required is a detected signal surfaced as advice, not enforced.
  const authSignal =
    plan.authentication?.required === true &&
    !flowTypes.includes("authenticated") &&
    !["expired_auth", "permission_denied"].some((category) => present.has(category));

  return { flowTypes, invalidFlowTypes, missing, conditionWarnings, authSignal };
}

function recipeStepHasSelector(step) {
  if (isNonEmptyString(step.role) && isNonEmptyString(step.name)) return true;
  if (isNonEmptyString(step.label)) return true;
  if (isNonEmptyString(step.testid)) return true;
  return false;
}

function validateRecipeSteps(steps, label) {
  const errors = [];
  if (steps == null) return errors;
  if (!Array.isArray(steps)) {
    errors.push(`${label}.playwright_steps must be an array of step objects`);
    return errors;
  }
  if (steps.length === 0) {
    errors.push(`${label}.playwright_steps must contain at least one step when provided`);
    return errors;
  }
  steps.forEach((step, index) => {
    const itemLabel = `${label}.playwright_steps[${index}]`;
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      errors.push(`${itemLabel} must be an object`);
      return;
    }
    if (!allowedRecipeActions.has(step.action)) {
      errors.push(`${itemLabel}.action must be one of: ${[...allowedRecipeActions].join(", ")}`);
      return;
    }
    switch (step.action) {
      case "goto":
      case "wait_for_url":
        if (!isNonEmptyString(step.url)) {
          errors.push(`${itemLabel}.url must be a non-empty string`);
        }
        break;
      case "press":
        if (!isNonEmptyString(step.key)) {
          errors.push(`${itemLabel}.key must be a non-empty string`);
        }
        break;
      case "fill":
        if (!recipeStepHasSelector(step)) {
          errors.push(`${itemLabel} requires a selector: role+name, label, or testid`);
        }
        if (typeof step.value !== "string") {
          errors.push(`${itemLabel}.value must be a string`);
        }
        break;
      case "click":
      case "expect_visible":
        if (!recipeStepHasSelector(step)) {
          errors.push(`${itemLabel} requires a selector: role+name, label, or testid`);
        }
        break;
      case "expect_text":
        if (!recipeStepHasSelector(step)) {
          errors.push(`${itemLabel} requires a selector: role+name, label, or testid`);
        }
        if (!isNonEmptyString(step.text)) {
          errors.push(`${itemLabel}.text must be a non-empty string`);
        }
        break;
      case "expect_count":
        if (!recipeStepHasSelector(step)) {
          errors.push(`${itemLabel} requires a selector: role+name, label, or testid`);
        }
        if (!Number.isInteger(step.count) || step.count < 0) {
          errors.push(`${itemLabel}.count must be a non-negative integer`);
        }
        break;
      case "screenshot":
        if (!isNonEmptyString(step.name)) {
          errors.push(`${itemLabel}.name must be a non-empty string`);
        }
        break;
    }
  });
  return errors;
}

function recipeHasAssertion(steps) {
  return Array.isArray(steps) && steps.some((step) => step && recipeAssertionActions.has(step.action));
}

function recipeStepLocator(step) {
  if (isNonEmptyString(step.role) && isNonEmptyString(step.name)) {
    return `page.getByRole(${JSON.stringify(step.role)}, { name: ${JSON.stringify(step.name)} })`;
  }
  if (isNonEmptyString(step.label)) {
    return `page.getByLabel(${JSON.stringify(step.label)})`;
  }
  if (isNonEmptyString(step.testid)) {
    return `page.getByTestId(${JSON.stringify(step.testid)})`;
  }
  return null;
}

function recipeStepTitle(step, index) {
  if (isNonEmptyString(step.note)) return step.note;
  const subject = step.name || step.label || step.testid || step.url || step.key || step.text || step.action;
  return `${index + 1}. ${step.action} ${subject}`.trim();
}

function emitRecipeStep(step) {
  switch (step.action) {
    case "goto":
      return `      await page.goto(${JSON.stringify(step.url)});`;
    case "wait_for_url":
      return `      await page.waitForURL(${JSON.stringify(step.url)});`;
    case "press":
      return `      await page.keyboard.press(${JSON.stringify(step.key)});`;
    case "click":
      return `      await ${recipeStepLocator(step)}.click();`;
    case "fill":
      return `      await ${recipeStepLocator(step)}.fill(${JSON.stringify(step.value)});`;
    case "expect_visible":
      return `      await expect(${recipeStepLocator(step)}).toBeVisible();`;
    case "expect_text":
      return `      await expect(${recipeStepLocator(step)}).toContainText(${JSON.stringify(step.text)});`;
    case "expect_count":
      return `      await expect(${recipeStepLocator(step)}).toHaveCount(${Number(step.count)});`;
    case "screenshot":
      return `      {
        const __body = await page.screenshot({ fullPage: true });
        await testInfo.attach(${JSON.stringify(step.name)}, { body: __body, contentType: 'image/png' });
      }`;
    default:
      return `      // unsupported action: ${quoteForComment(step.action)}`;
  }
}

function emitRecipeBody(steps) {
  return steps.map((step, index) => {
    const title = recipeStepTitle(step, index);
    return `    await test.step(${JSON.stringify(title)}, async () => {
${emitRecipeStep(step)}
    });`;
  }).join("\n");
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
    errors.push(...validateRecipeSteps(plan.baseline_flow.playwright_steps, "baseline_flow"));
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
      errors.push(...validateRecipeSteps(scenario.playwright_steps, label));
    });
  }
  if (!hasItems(plan.assertions)) errors.push("assertions must include at least one item");
  if (!hasItems(plan.recovery_expectations)) errors.push("recovery_expectations must include at least one item");
  if (!hasItems(plan.verification_commands)) errors.push("verification commands are empty");

  const coverage = computeCoverage(plan);
  for (const flowType of coverage.invalidFlowTypes) {
    errors.push(`flow_type has invalid value: ${flowType} (allowed: ${[...allowedFlowTypes].join(", ")})`);
  }
  for (const gap of coverage.missing) {
    errors.push(
      `flow_type "${gap.flow_type}" requires a scenario in category: ${gap.expected.join(" or ")}`
    );
  }
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
        "evidence_artifacts",
        "recovery_notes",
        "executed_commands",
        "open_risks"
      ]) {
        if (result?.[field] != null && !isStringArray(result[field])) {
          errors.push(`${label}.${field} must be an array of strings when provided`);
        }
      }
      if (result?.evidence_items != null) {
        if (!Array.isArray(result.evidence_items)) {
          errors.push(`${label}.evidence_items must be an array when provided`);
        } else {
          result.evidence_items.forEach((item, itemIndex) => {
            const itemLabel = `${label}.evidence_items[${itemIndex}]`;
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              errors.push(`${itemLabel} must be an object`);
              return;
            }
            for (const field of ["kind", "path", "label", "content_type"]) {
              if (item[field] != null && typeof item[field] !== "string") {
                errors.push(`${itemLabel}.${field} must be a string when provided`);
              }
            }
          });
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

function printWarnings(warnings) {
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
}

function coverageWarnings(coverage) {
  const warnings = [];
  for (const entry of coverage.conditionWarnings) {
    warnings.push(
      `declared ${entry.condition} has no covering scenario in category: ${entry.expected.join(" or ")}`
    );
  }
  if (coverage.authSignal) {
    warnings.push(
      "authentication.required is true but no expired_auth or permission_denied scenario is defined"
    );
  }
  return warnings;
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
  printWarnings(coverageWarnings(computeCoverage(plan)));
  console.log(`OK: ${planPath}`);
}

function commandCoverage(planPath) {
  const plan = readPlan(planPath);
  const coverage = computeCoverage(plan);
  const present = [...planScenarioCategorySet(plan)].sort();
  const lines = ["# UX Gremlin Coverage", ""];
  lines.push(`- Declared flow types: ${coverage.flowTypes.join(", ") || "(none)"}`);
  lines.push(`- Scenario categories present: ${present.join(", ") || "(none)"}`);
  lines.push("");
  lines.push("## Required Category Gaps");
  lines.push("");
  if (coverage.invalidFlowTypes.length > 0) {
    for (const flowType of coverage.invalidFlowTypes) {
      lines.push(`- Invalid flow_type: ${flowType}`);
    }
  }
  if (coverage.missing.length === 0) {
    lines.push("- None. All declared flow types are covered.");
  } else {
    for (const gap of coverage.missing) {
      lines.push(`- ${gap.flow_type}: add a scenario in category ${gap.expected.join(" or ")}`);
    }
  }
  lines.push("");
  lines.push("## Declared Condition Warnings");
  lines.push("");
  const warnings = coverageWarnings(coverage);
  if (warnings.length === 0) {
    lines.push("- None. All declared conditions have covering scenarios.");
  } else {
    for (const warning of warnings) lines.push(`- ${warning}`);
  }
  console.log(lines.join("\n"));
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

  const baselineRecipe = Array.isArray(plan.baseline_flow?.playwright_steps) && plan.baseline_flow.playwright_steps.length > 0
    ? plan.baseline_flow.playwright_steps
    : null;
  const baselineRecipeAsserts = recipeHasAssertion(baselineRecipe);
  const baselineRecipeHasGoto = baselineRecipe?.some((step) => step?.action === "goto") ?? false;
  const baselineBody = baselineRecipe
    ? emitRecipeBody(baselineRecipe)
    : (plan.baseline_flow?.steps ?? []).map((step, index) => `    await test.step(${JSON.stringify(`Baseline ${index + 1}: ${step}`)}, async () => {
      // TODO: implement with role-based locators and accessible names.
      // Example: await page.getByRole('button', { name: /add new/i }).click();
    });`).join("\n");
  const baselineGotoLine = baselineRecipe && baselineRecipeHasGoto ? "" : "    await page.goto(targetUrl);\n";
  const baselineGuard = baselineRecipeAsserts
    ? ""
    : `\n    requireImplementation('baseline happy path', [${JSON.stringify(quoteForComment(plan.baseline_flow?.expected_result))}]);`;

  const scenarioTests = (plan.gremlin_scenarios ?? []).map((scenario) => {
    const recipe = Array.isArray(scenario.playwright_steps) && scenario.playwright_steps.length > 0
      ? scenario.playwright_steps
      : null;
    const recipeAsserts = recipeHasAssertion(recipe);
    const recipeHasGoto = recipe?.some((step) => step?.action === "goto") ?? false;

    const stepsBlock = recipe
      ? emitRecipeBody(recipe)
      : (scenario.steps ?? []).map((step, index) => `    await test.step(${JSON.stringify(`${index + 1}. ${step}`)}, async () => {
      // TODO: mutate the baseline flow for category "${scenario.category}".
    });`).join("\n");

    const annotation = `{ annotation: [{ type: 'ux-gremlin-scenario', description: ${JSON.stringify(scenario.id ?? "")} }, { type: 'ux-gremlin-risk', description: ${JSON.stringify(scenario.risk_level ?? "")} }] }`;
    const gotoLine = recipe && recipeHasGoto ? "" : "    await page.goto(targetUrl);\n";

    const expectationComments = [
      `    // Expected behavior: ${quoteForComment(scenario.expected_behavior)}`,
      `    // Recovery check: ${quoteForComment(scenario.recovery_expectation)}`,
      `    // Accessibility notes: ${quoteForComment(scenario.accessibility_notes)}`,
      `    // Playwright notes: ${quoteForComment(scenario.playwright_notes)}`
    ].join("\n");

    let guard = "";
    if (!recipeAsserts) {
      const assertionsList = (scenario.assertions ?? []).map((assertion) => `      ${JSON.stringify(quoteForComment(assertion))},`).join("\n");
      guard = `
    // TODO: replace the guard below with concrete expect(...) assertions.
    requireImplementation(${JSON.stringify(scenario.id ?? "scenario")}, [
${assertionsList}
    ]);`;
    }

    return `
  test(${JSON.stringify(`${scenario.id}: ${testName(scenario.name)}`)}, ${annotation}, async ({ page }, testInfo) => {
    test.skip(destructiveActionsAllowed === false && ${JSON.stringify(scenario.risk_level)} === "critical", "Critical/destructive UX paths require explicit safety review.");
${gotoLine}${stepsBlock}
${expectationComments}${guard}
  });`;
  }).join("\n");

  const source = `import { test, expect } from '@playwright/test';

const targetUrl = process.env.UX_GREMLIN_TARGET_URL || ${JSON.stringify(plan.target?.url || "http://localhost:3000")};
const destructiveActionsAllowed = ${plan.safety?.destructive_actions_allowed === true};

// Generated scenarios fail by default so an unfinished spec cannot silently pass
// in CI. Implement the assertions, then delete the matching requireImplementation
// call. Set UX_GREMLIN_ALLOW_TODO=true to soft-skip while iterating locally.
function requireImplementation(scenarioId, assertions) {
  const allowTodo = ['1', 'true', 'yes'].includes((process.env.UX_GREMLIN_ALLOW_TODO || '').trim().toLowerCase());
  if (allowTodo) {
    test.skip(true, \`UX Gremlin: \${scenarioId} not implemented yet\`);
    return;
  }
  const detail = assertions.length > 0 ? \` Expected assertions: \${assertions.join(' | ')}\` : '';
  throw new Error(\`UX Gremlin: implement assertions for "\${scenarioId}" before running in CI.\${detail}\`);
}

test.describe(${JSON.stringify(plan.name || "UX Gremlin Plan")}, () => {
  test('baseline happy path', { annotation: [{ type: 'ux-gremlin-baseline', description: 'true' }] }, async ({ page }, testInfo) => {
${baselineGotoLine}${baselineBody || "    // TODO: add baseline happy-path steps."}
    // Expected result: ${quoteForComment(plan.baseline_flow?.expected_result)}
    await expect(page).toHaveURL(/./);${baselineGuard}
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

function collectPlanValidation(planPath) {
  try {
    const plan = readPlan(planPath);
    const errors = validatePlan(plan);
    const warnings = coverageWarnings(computeCoverage(plan));
    return { plan, errors, warnings };
  } catch (err) {
    return { plan: null, errors: [err.message], warnings: [] };
  }
}

function activeRequireImplementationCalls(source) {
  return [...source.matchAll(/\brequireImplementation\s*\(/g)].filter((match) => {
    const before = source.slice(Math.max(0, match.index - 20), match.index);
    return !/\bfunction\s+$/.test(before);
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasScenarioAnnotation(source, scenarioId) {
  const quotedId = escapeRegExp(scenarioId);
  const pattern = new RegExp(
    `type:\\s*['"]ux-gremlin-scenario['"][\\s\\S]{0,240}description:\\s*(['"])${quotedId}\\1`
  );
  return pattern.test(source);
}

function validateGeneratedSpec(plan, specPath = path.resolve(outputSpecPath)) {
  const errors = [];
  const guidance = [];
  if (!fs.existsSync(specPath)) {
    errors.push(`generated Playwright spec is missing: ${displayPath(specPath)}`);
    guidance.push("Run generate-playwright after the plan passes check and coverage.");
    return { errors, guidance };
  }

  const source = fs.readFileSync(specPath, "utf-8");
  if (source.includes("TODO:")) {
    errors.push("generated Playwright spec still contains TODO placeholders");
    guidance.push("Replace generated TODO step comments with app-specific locators, actions, and expect(...) assertions.");
  }

  const activeGuards = activeRequireImplementationCalls(source);
  if (activeGuards.length > 0) {
    errors.push(`generated Playwright spec still contains ${activeGuards.length} active requireImplementation(...) guard(s)`);
    guidance.push("Remove each requireImplementation(...) call after replacing it with concrete assertions.");
  }

  if (!source.includes("ux-gremlin-baseline")) {
    errors.push("generated Playwright spec is missing the ux-gremlin-baseline annotation required for ingest");
    guidance.push("Regenerate the spec or restore the baseline annotation before running Playwright.");
  }

  const scenarioIds = (plan.gremlin_scenarios ?? []).map((scenario) => scenario.id).filter(Boolean);
  if (!source.includes("ux-gremlin-scenario")) {
    errors.push("generated Playwright spec is missing ux-gremlin-scenario annotations required for ingest");
    guidance.push("Regenerate the spec or restore scenario annotations before running Playwright.");
  }
  for (const scenarioId of scenarioIds) {
    if (!hasScenarioAnnotation(source, scenarioId)) {
      errors.push(`generated Playwright spec is missing annotation for scenario ${scenarioId}`);
    }
  }

  return { errors, guidance: [...new Set(guidance)] };
}

function printWorkflowErrors(errors, guidance = []) {
  printErrors(errors);
  for (const item of guidance) console.error(`NEXT: ${item}`);
}

function commandWorkflowStatus(planPath, phase, options = {}) {
  if (!phase) {
    console.error("ERROR: workflow-status requires --phase <plan|generate|execute|ingest|report>");
    process.exit(2);
  }
  if (!allowedWorkflowPhases.has(phase)) {
    console.error(`ERROR: --phase must be one of: ${[...allowedWorkflowPhases].join(", ")}`);
    process.exit(2);
  }

  const { plan, errors: planErrors, warnings } = collectPlanValidation(planPath);
  if (planErrors.length > 0) {
    printWorkflowErrors(planErrors, [
      "Create or repair .agent/session/ux-gremlin-plan.yaml, then rerun check and workflow-status for the same phase."
    ]);
    process.exit(1);
  }
  printWarnings(warnings);

  if (phase === "plan" || phase === "generate") {
    console.log(`OK: workflow ${phase} gate passed for ${planPath}`);
    return;
  }

  const specStatus = validateGeneratedSpec(plan);
  if (specStatus.errors.length > 0) {
    printWorkflowErrors(specStatus.errors, specStatus.guidance);
    process.exit(1);
  }

  if (phase === "execute") {
    console.log(`OK: workflow execute gate passed for ${outputSpecPath}`);
    return;
  }

  if (phase === "ingest") {
    if (!options.input) {
      printWorkflowErrors(["ingest phase requires --input <playwright-json>"], [
        `Run Playwright with a JSON reporter, then rerun workflow-status --phase ingest --input <playwright-json>.`
      ]);
      process.exit(2);
    }
    try {
      readJsonFile(path.resolve(options.input), "Playwright report");
    } catch (err) {
      printWorkflowErrors([err.message], [
        "Fix or regenerate the Playwright JSON report before running ingest."
      ]);
      process.exit(1);
    }
    console.log(`OK: workflow ingest gate passed for ${options.input}`);
    return;
  }

  const resultsPath = options.results ? path.resolve(options.results) : path.resolve(defaultIngestOut);
  let results;
  try {
    results = readResults(resultsPath);
  } catch (err) {
    printWorkflowErrors([err.message], [
      `Run ingest --input <playwright-json> --out ${defaultIngestOut}, then rerun workflow-status --phase report.`
    ]);
    process.exit(1);
  }
  const resultErrors = validateResults(results, plan);
  if (resultErrors.length > 0) {
    printWorkflowErrors(resultErrors, [
      "Fix the ingested results file or rerun ingest before generating executed reports."
    ]);
    process.exit(1);
  }
  console.log(`OK: workflow report gate passed for ${displayPath(resultsPath)}`);
}

function readJsonFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file is missing: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`${label} file is not valid JSON: ${err.message}`);
  }
}

function collectPlaywrightSpecs(report) {
  const specs = [];
  const walk = (suite) => {
    if (!suite || typeof suite !== "object") return;
    for (const spec of suite.specs ?? []) specs.push(spec);
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return specs;
}

function playwrightOutcomeToStatus(outcome) {
  switch (outcome) {
    case "expected":
      return "passed";
    case "unexpected":
      return "failed";
    case "flaky":
      return "needs_review";
    case "skipped":
      return "not_run";
    default:
      return "needs_review";
  }
}

function annotationValue(annotations, type) {
  const match = (annotations ?? []).find((entry) => entry?.type === type);
  return match ? match.description ?? "" : null;
}

function severityForStatus(status, risk) {
  const normalizedRisk = allowedResultSeverities.has(risk) ? risk : null;
  if (status === "failed") return normalizedRisk || "high";
  if (status === "needs_review") return normalizedRisk || "medium";
  if (status === "blocked") return normalizedRisk || "medium";
  return "info";
}

function toPosixPath(value) {
  return String(value).replace(/\\/g, "/");
}

function relativeToCwd(absPath) {
  const rel = path.relative(process.cwd(), absPath);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return toPosixPath(absPath);
  return toPosixPath(rel);
}

function sanitizePathSegment(value, fallback) {
  const normalized = stringOrEmpty(value)
    .normalize("NFKD")
    .replace(/[\\/]+/g, "-")
    .replace(/[^A-Za-z0-9._ -]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 96);
  return normalized || fallback;
}

function attachmentLabel(attachment, sourcePath) {
  return stringOrEmpty(attachment?.name || path.basename(sourcePath) || "evidence");
}

function evidenceKindForAttachment(attachment, sourcePath) {
  const contentType = stringOrEmpty(attachment?.contentType).toLowerCase();
  const name = `${attachment?.name || ""} ${sourcePath || ""}`.toLowerCase();
  const ext = path.extname(sourcePath || "").toLowerCase();
  if (contentType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
    return "screenshot";
  }
  if (name.includes("trace") || contentType.includes("zip") || ext === ".zip") return "trace";
  return "artifact";
}

function resolveAttachmentPath(attachment, inputDir) {
  if (!attachment?.path || typeof attachment.path !== "string") return null;
  if (path.isAbsolute(attachment.path)) return attachment.path;
  const fromInputDir = path.resolve(inputDir, attachment.path);
  if (fs.existsSync(fromInputDir)) return fromInputDir;
  return path.resolve(attachment.path);
}

function uniqueEvidenceDestination(scenarioDir, desiredFileName, usedNames) {
  const parsed = path.parse(desiredFileName);
  const base = parsed.name || "evidence";
  const ext = parsed.ext || "";
  let candidate = `${base}${ext}`;
  let counter = 2;
  while (usedNames.has(candidate) || fs.existsSync(path.join(scenarioDir, candidate))) {
    candidate = `${base}-${counter}${ext}`;
    counter += 1;
  }
  usedNames.add(candidate);
  return path.join(scenarioDir, candidate);
}

function copyEvidenceAttachments(scenarioId, attachments, inputDir) {
  const evidence = { screenshots: [], traces: [], evidence_artifacts: [], evidence_items: [], open_risks: [] };
  const values = Array.isArray(attachments) ? attachments : [];
  if (values.length === 0) return evidence;

  const scenarioDir = path.resolve(defaultEvidenceDir, sanitizePathSegment(scenarioId, "scenario"));
  ensureDir(scenarioDir);
  const usedNames = new Set();

  for (const attachment of values) {
    const sourcePath = resolveAttachmentPath(attachment, inputDir);
    const label = attachmentLabel(attachment, sourcePath || attachment?.path || "evidence");
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      evidence.open_risks.push(`Evidence attachment could not be copied for ${scenarioId}: ${label}`);
      continue;
    }
    const sourceExt = path.extname(sourcePath);
    const rawName = attachment?.name && path.extname(attachment.name) ? attachment.name : `${attachment?.name || path.basename(sourcePath, sourceExt)}${sourceExt}`;
    const safeName = sanitizePathSegment(rawName, "evidence") || `evidence${sourceExt || ""}`;
    const destination = uniqueEvidenceDestination(scenarioDir, safeName, usedNames);
    try {
      fs.copyFileSync(sourcePath, destination);
    } catch (error) {
      evidence.open_risks.push(`Evidence attachment could not be copied for ${scenarioId}: ${label} (${error.message})`);
      continue;
    }

    const relPath = relativeToCwd(destination);
    const kind = evidenceKindForAttachment(attachment, sourcePath);
    const item = {
      kind,
      path: relPath,
      label,
      content_type: stringOrEmpty(attachment?.contentType)
    };
    evidence.evidence_items.push(item);
    if (kind === "screenshot") evidence.screenshots.push(relPath);
    else if (kind === "trace") evidence.traces.push(relPath);
    else evidence.evidence_artifacts.push(relPath);
  }

  evidence.screenshots = [...new Set(evidence.screenshots)];
  evidence.traces = [...new Set(evidence.traces)];
  evidence.evidence_artifacts = [...new Set(evidence.evidence_artifacts)];
  evidence.open_risks = [...new Set(evidence.open_risks)];
  return evidence;
}

function loadAxeIssues(axePath) {
  if (!axePath) return { byScenario: new Map(), global: [] };
  const resolved = path.resolve(axePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`optional --axe file could not be read: ${resolved}. Omit --axe if axe-core results are unavailable.`);
  }
  const data = readJsonFile(resolved, "axe");
  const byScenario = new Map();
  const global = [];
  const formatViolation = (violation) => {
    const impact = violation?.impact ? ` (${violation.impact})` : "";
    const help = violation?.help || violation?.description || "";
    return `${violation?.id || "violation"}${impact}: ${help}`.trim();
  };
  const ingestRun = (run, scenarioId) => {
    const issues = (run?.violations ?? []).map(formatViolation);
    if (scenarioId) {
      byScenario.set(scenarioId, [...(byScenario.get(scenarioId) ?? []), ...issues]);
    } else {
      global.push(...issues);
    }
  };
  if (Array.isArray(data)) {
    for (const entry of data) ingestRun(entry, entry?.scenario_id || entry?.scenarioId || null);
  } else {
    ingestRun(data, data?.scenario_id || data?.scenarioId || null);
  }
  return { byScenario, global };
}

function commandIngest(planPath, inputPath, axePath, outPath) {
  if (!inputPath) {
    console.error("ERROR: ingest requires --input <playwright-json>");
    process.exit(2);
  }
  const plan = readPlan(planPath);
  const planErrors = validatePlan(plan);
  if (planErrors.length > 0) {
    printErrors(planErrors);
    process.exit(1);
  }
  const report = readJsonFile(path.resolve(inputPath), "Playwright report");
  const inputDir = path.dirname(path.resolve(inputPath));
  const axe = loadAxeIssues(axePath);
  const specs = collectPlaywrightSpecs(report);
  const planScenarioIds = new Set((plan.gremlin_scenarios ?? []).map((scenario) => scenario.id).filter(Boolean));

  let baselineFailed = false;
  const scenarioResults = [];
  for (const spec of specs) {
    for (const pwTest of spec.tests ?? []) {
      const annotations = pwTest.annotations ?? [];
      const isBaseline =
        annotationValue(annotations, "ux-gremlin-baseline") != null ||
        spec.title === baselineTestTitle;
      const status = playwrightOutcomeToStatus(pwTest.status);
      if (isBaseline) {
        if (status === "failed") baselineFailed = true;
        continue;
      }
      let scenarioId = annotationValue(annotations, "ux-gremlin-scenario");
      if (!scenarioId && typeof spec.title === "string" && spec.title.includes(":")) {
        scenarioId = spec.title.slice(0, spec.title.indexOf(":")).trim();
      }
      if (!scenarioId) continue;
      if (planScenarioIds.size > 0 && !planScenarioIds.has(scenarioId)) continue;
      const risk = annotationValue(annotations, "ux-gremlin-risk");
      const errors = (pwTest.results ?? [])
        .flatMap((result) => [result?.error?.message, ...(result?.errors ?? []).map((item) => item?.message)])
        .filter(Boolean)
        .map((message) => String(message).split("\n")[0].trim());
      const attachments = (pwTest.results ?? []).flatMap((result) => result?.attachments ?? []);
      const copiedEvidence = copyEvidenceAttachments(scenarioId, attachments, inputDir);
      scenarioResults.push({
        scenario_id: scenarioId,
        status,
        severity: severityForStatus(status, risk),
        outcome: `Playwright reported "${pwTest.status}".`,
        findings: [...new Set(errors)],
        suspected_bugs: [],
        accessibility_issues: axe.byScenario.get(scenarioId) ?? [],
        console_errors: [],
        screenshots: copiedEvidence.screenshots,
        traces: copiedEvidence.traces,
        evidence_artifacts: copiedEvidence.evidence_artifacts,
        evidence_items: copiedEvidence.evidence_items,
        recovery_notes: [],
        executed_commands: [],
        open_risks: copiedEvidence.open_risks
      });
    }
  }

  const openRisks = [...axe.global, ...scenarioResults.flatMap((result) => result.open_risks ?? [])];
  if (baselineFailed) {
    for (const result of scenarioResults) {
      if (result.status === "not_run" || result.status === "passed") {
        result.status = "blocked";
        result.severity = severityForStatus("blocked", result.severity);
      }
      result.recovery_notes.push("Baseline failed; scenario blocked until the happy path is restored.");
    }
    openRisks.unshift("Baseline happy path failed; all mutation scenarios are blocked.");
  }

  const results = {
    version: "1.0",
    run: {
      executed_at: new Date().toISOString(),
      executor: "Playwright JSON ingest",
      environment: plan.target?.environment || "",
      mode: plan.mode || "playwright_cli",
      build: process.env.UX_GREMLIN_BUILD || "",
      commit: process.env.UX_GREMLIN_COMMIT || report.config?.metadata?.commit || "",
      notes: baselineFailed
        ? "Baseline failed; mutation scenarios were blocked during ingest."
        : "Generated from Playwright JSON report."
    },
    executed_commands: ["npx playwright test --reporter=json"],
    open_risks: [...new Set(openRisks)],
    scenario_results: scenarioResults
  };

  const resolvedOut = path.resolve(outPath || defaultIngestOut);
  ensureDir(path.dirname(resolvedOut));
  fs.writeFileSync(resolvedOut, `${JSON.stringify(results, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${resolvedOut}`);
  console.log(`Scenarios ingested: ${scenarioResults.length}${baselineFailed ? " (baseline failed; mutations blocked)" : ""}`);
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

function markdownLinkText(value) {
  return stringOrEmpty(value).replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function encodePathForHref(value) {
  return toPosixPath(value)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function evidenceAbsolutePath(evidencePath) {
  if (!evidencePath) return null;
  return path.isAbsolute(evidencePath) ? evidencePath : path.resolve(evidencePath);
}

function isEvidencePath(evidencePath) {
  const absPath = evidenceAbsolutePath(evidencePath);
  if (!absPath) return false;
  const evidenceRoot = path.resolve(".agent/evidence");
  const rel = path.relative(evidenceRoot, absPath);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function evidenceHref(evidencePath, reportArtifactPath) {
  if (!isEvidencePath(evidencePath)) return null;
  const rel = path.relative(path.dirname(reportArtifactPath), evidenceAbsolutePath(evidencePath));
  return encodePathForHref(rel || path.basename(evidencePath));
}

function evidenceDisplayLabel(item) {
  const label = item?.label || path.basename(item?.path || "evidence");
  const kind = item?.kind && item.kind !== "artifact" ? `${item.kind}: ` : "";
  return `${kind}${label}`;
}

function markdownEvidenceList(items, fallback, reportArtifactPath) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (values.length === 0) return fallback;
  return values
    .map((item) => {
      const pathValue = typeof item === "string" ? item : item.path;
      const label = typeof item === "string" ? item : evidenceDisplayLabel(item);
      const href = evidenceHref(pathValue, reportArtifactPath);
      if (!href) return `- ${label}`;
      return `- [${markdownLinkText(label)}](${href})`;
    })
    .join("\n");
}

function incrementCount(counts, key) {
  const normalized = key || "unknown";
  counts[normalized] = (counts[normalized] ?? 0) + 1;
}

function displayPath(absPath) {
  const rel = path.relative(process.cwd(), absPath);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return absPath;
  return rel;
}

function buildArtifactPaths(outDir) {
  return {
    markdown: path.join(outDir, "report.md"),
    json: path.join(outDir, "report.json"),
    html: path.join(outDir, "report.html"),
    junit: path.join(outDir, "report.junit.xml"),
    pr: path.join(outDir, "report.pr.md")
  };
}

function resolveReportDir(plan, outDirArg) {
  return path.resolve(outDirArg || plan.reporting?.output_dir || defaultReportDir);
}

function maxSeverity(severities) {
  let best = null;
  for (const severity of severities) {
    if (!severityRank.has(severity)) continue;
    if (best === null || severityRank.get(severity) > severityRank.get(best)) best = severity;
  }
  return best;
}

function severityAtLeast(severity, threshold) {
  if (!severityRank.has(severity) || !severityRank.has(threshold)) return false;
  return severityRank.get(severity) >= severityRank.get(threshold);
}

function recommendedAction(scenario) {
  if (scenario.status === "failed") {
    return scenario.suspected_bugs.length > 0
      ? "Fix defect and add a regression test."
      : "Investigate failure and confirm expected behavior.";
  }
  if (scenario.status === "blocked") return "Restore the baseline happy path, then re-run.";
  if (scenario.status === "needs_review") return "Triage with design/PM and decide on a fix.";
  if (scenario.accessibility_issues.length > 0) return "Schedule accessibility remediation.";
  if (scenario.suspected_bugs.length > 0) return "Confirm the suspected defect and prioritize.";
  return "Review the recorded evidence.";
}

function buildTopIssues(scenarios) {
  const issues = scenarios
    .filter(
      (scenario) =>
        ["failed", "blocked", "needs_review"].includes(scenario.status) ||
        scenario.suspected_bugs.length > 0 ||
        scenario.accessibility_issues.length > 0
    )
    .map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      status: scenario.status,
      severity: scenario.severity,
      impact:
        scenario.suspected_bugs[0] ||
        scenario.findings[0] ||
        scenario.accessibility_issues[0] ||
        scenario.outcome ||
        "See scenario detail.",
      recommended_action: recommendedAction(scenario)
    }));
  const statusPriority = { failed: 0, blocked: 1, needs_review: 2, passed: 3, not_run: 4 };
  issues.sort((a, b) => {
    const severityDelta = (severityRank.get(b.severity) ?? 0) - (severityRank.get(a.severity) ?? 0);
    if (severityDelta !== 0) return severityDelta;
    return (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9);
  });
  return issues;
}

function computeExecutiveSummary(scenarios, hasResults, suspectedBugCount, accessibilityIssueCount, openRiskCount) {
  const counts = { passed: 0, failed: 0, blocked: 0, needs_review: 0, not_run: 0 };
  for (const scenario of scenarios) {
    counts[scenario.status] = (counts[scenario.status] ?? 0) + 1;
  }
  const executed = counts.passed + counts.failed + counts.blocked + counts.needs_review;
  const passRate = executed > 0 ? Math.round((counts.passed / executed) * 100) : null;

  const openSeverities = scenarios
    .filter(
      (scenario) =>
        ["failed", "blocked", "needs_review"].includes(scenario.status) ||
        scenario.suspected_bugs.length > 0 ||
        scenario.accessibility_issues.length > 0
    )
    .map((scenario) => scenario.severity);
  const highestOpenSeverity = maxSeverity(openSeverities);

  let verdict;
  if (!hasResults || executed === 0) {
    verdict = "Not executed";
  } else if (counts.failed > 0 || counts.blocked > 0) {
    verdict = "Fail";
  } else if (
    counts.needs_review > 0 ||
    suspectedBugCount > 0 ||
    accessibilityIssueCount > 0 ||
    openRiskCount > 0
  ) {
    verdict = "Pass with risks";
  } else {
    verdict = "Pass";
  }

  // Severity-weighted exposure: only unresolved scenarios contribute.
  const statusFactor = { failed: 1, blocked: 0.75, needs_review: 0.5, not_run: 0, passed: 0 };
  const rawScore = scenarios.reduce((sum, scenario) => {
    const weight = severityWeights[scenario.severity] ?? 0;
    return sum + weight * (statusFactor[scenario.status] ?? 0);
  }, 0);
  const maxScore = scenarios.length * severityWeights.critical;
  const riskScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  let riskBand = "low";
  if (riskScore >= 60) riskBand = "critical";
  else if (riskScore >= 35) riskBand = "high";
  else if (riskScore >= 15) riskBand = "medium";

  return {
    verdict,
    pass_rate: passRate,
    executed_count: executed,
    suspected_bug_count: suspectedBugCount,
    accessibility_blocker_count: accessibilityIssueCount,
    highest_open_severity: highestOpenSeverity || "none",
    risk_score: riskScore,
    risk_band: riskBand
  };
}

function normalizeReport(plan, results, outDir) {
  const resultByScenario = new Map((results?.scenario_results ?? []).map((result) => [result.scenario_id, result]));
  const scenarios = (plan.gremlin_scenarios ?? []).map((scenario) => {
    const result = resultByScenario.get(scenario.id) ?? {};
    const status = result.status || "not_run";
    const severity = result.severity || (results ? "info" : scenario.risk_level || "info");
    const screenshots = asArray(result.screenshots);
    const traces = asArray(result.traces);
    const evidenceArtifacts = asArray(result.evidence_artifacts);
    const evidence = normalizeEvidenceItems(result.evidence_items, { screenshots, traces, evidenceArtifacts });
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
      screenshots,
      traces,
      evidence_artifacts: evidenceArtifacts,
      evidence,
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
  for (const scenario of scenarios) {
    scenario.evidence = scenario.evidence.map((item) => ({
      ...item,
      href: evidenceHref(item.path, artifactPaths.html),
      markdown_href: evidenceHref(item.path, artifactPaths.markdown)
    }));
  }
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
      build: results?.run?.build || "",
      commit: results?.run?.commit || "",
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
    executive_summary: computeExecutiveSummary(
      scenarios,
      Boolean(results),
      scenarios.reduce((sum, scenario) => sum + scenario.suspected_bugs.length, 0),
      scenarios.reduce((sum, scenario) => sum + scenario.accessibility_issues.length, 0),
      [...new Set(globalRisks)].length
    ),
    top_issues: buildTopIssues(scenarios),
    scenarios,
    evidence: {
      screenshots: scenarios.flatMap((scenario) => scenario.screenshots),
      traces: scenarios.flatMap((scenario) => scenario.traces),
      artifacts: scenarios.flatMap((scenario) => scenario.evidence)
    },
    executed_commands: [...new Set(globalCommands)],
    verification_commands: asArray(plan.verification_commands),
    recovery_expectations: asArray(plan.recovery_expectations),
    open_risks: [...new Set(globalRisks)],
    artifacts: {
      markdown: artifactPaths.markdown,
      json: artifactPaths.json,
      html: artifactPaths.html,
      junit: artifactPaths.junit,
      pr: artifactPaths.pr
    },
    trend: null
  };
}

function normalizeEvidenceItems(items, sources) {
  const seen = new Set();
  const normalized = [];
  const push = (item) => {
    if (!item?.path || seen.has(item.path)) return;
    seen.add(item.path);
    normalized.push({
      kind: item.kind || "artifact",
      path: item.path,
      label: item.label || path.basename(item.path),
      content_type: item.content_type || "",
      href: null
    });
  };
  for (const item of Array.isArray(items) ? items : []) {
    if (item && typeof item === "object" && !Array.isArray(item)) push(item);
  }
  for (const itemPath of sources.screenshots) push({ kind: "screenshot", path: itemPath, label: path.basename(itemPath) });
  for (const itemPath of sources.traces) push({ kind: "trace", path: itemPath, label: path.basename(itemPath) });
  for (const itemPath of sources.evidenceArtifacts) push({ kind: "artifact", path: itemPath, label: path.basename(itemPath) });
  return normalized;
}

function mdCell(value) {
  return stringOrEmpty(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function mdTable(headers, rows, emptyMessage) {
  if (rows.length === 0) return emptyMessage;
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(mdCell).join(" | ")} |`).join("\n");
  return `${head}\n${divider}\n${body}`;
}

function countsTable(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return mdTable(["Key", "Count"], entries.map(([key, count]) => [key, count]), "- None recorded.");
}

function trendLine(trend) {
  if (!trend) return "- No previous run recorded; this is the first tracked run.";
  const formatDelta = (value, suffix = "") => {
    if (value === null || value === undefined) return "n/a";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value}${suffix}`;
  };
  return [
    `- Compared with run from ${trend.previous_generated_at || "unknown"}.`,
    `- Pass rate: ${formatDelta(trend.pass_rate_delta, "%")} (now ${trend.pass_rate ?? "n/a"}%).`,
    `- Suspected bugs: ${formatDelta(trend.suspected_bug_delta)} (now ${trend.suspected_bug_count}).`,
    `- Accessibility issues: ${formatDelta(trend.accessibility_issue_delta)} (now ${trend.accessibility_issue_count}).`
  ].join("\n");
}

function renderMarkdownReport(report) {
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
${markdownEvidenceList(scenario.evidence, "- None recorded.", report.artifacts.markdown)}

Recovery Notes:
${formatList(scenario.recovery_notes, "- Pending execution.")}
`).join("\n");

  const allFindings = report.scenarios.flatMap((scenario) => scenario.findings.map((item) => `${scenario.id}: ${item}`));
  const allBugs = report.scenarios.flatMap((scenario) => scenario.suspected_bugs.map((item) => `${scenario.id}: ${item}`));
  const allAccessibility = report.scenarios.flatMap((scenario) => scenario.accessibility_issues.map((item) => `${scenario.id}: ${item}`));
  const allConsoleErrors = report.scenarios.flatMap((scenario) => scenario.console_errors.map((item) => `${scenario.id}: ${item}`));

  const exec = report.executive_summary;
  const scenarioTable = mdTable(
    ["ID", "Name", "Category", "Risk", "Status", "Severity"],
    report.scenarios.map((scenario) => [
      scenario.id,
      scenario.name,
      scenario.category,
      scenario.risk_level,
      scenario.status,
      scenario.severity
    ]),
    "No scenarios recorded."
  );
  const topIssuesTable = mdTable(
    ["Severity", "Status", "Scenario", "Category", "Suspected Impact", "Recommended Action"],
    report.top_issues.map((issue) => [
      issue.severity,
      issue.status,
      `${issue.id}: ${issue.name}`,
      issue.category,
      issue.impact,
      issue.recommended_action
    ]),
    "- No open issues. Every executed scenario passed without suspected bugs or accessibility blockers."
  );

  return `# UX Gremlin Report

## Executive Summary

- Verdict: **${exec.verdict}**
- Pass rate: ${exec.pass_rate === null ? "n/a (not executed)" : `${exec.pass_rate}%`} (${exec.executed_count} of ${report.summary.scenario_count} scenarios executed)
- Risk score: ${exec.risk_score}/100 (${exec.risk_band})
- Highest open severity: ${exec.highest_open_severity}
- Suspected bugs: ${exec.suspected_bug_count}
- Accessibility blockers: ${exec.accessibility_blocker_count}
- Target: ${report.plan.name || report.plan.target.url || report.plan.target.app_area || "(unnamed)"}
- Environment: ${report.run.environment || report.plan.target.environment || "(not set)"}
- Executed at: ${report.run.executed_at || "(not executed)"}${report.run.executor ? ` by ${report.run.executor}` : ""}
- Build/commit: ${report.run.build || "(n/a)"}${report.run.commit ? ` / ${report.run.commit}` : ""}

## Trend

${trendLine(report.trend)}

## Top Issues & Recommended Actions

${topIssuesTable}

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

### Status counts

${countsTable(report.summary.status_counts)}

### Severity counts

${countsTable(report.summary.severity_counts)}

### Category counts

${countsTable(report.summary.category_counts)}

## Scenarios Tested

${scenarioTable}

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

- Output directory: ${displayPath(path.dirname(report.artifacts.markdown))}
${markdownEvidenceList(report.evidence.artifacts, "- Pending execution.", report.artifacts.markdown)}

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

function htmlEvidenceList(items, fallback, reportArtifactPath) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (values.length === 0) return `<p>${escapeHtml(fallback)}</p>`;
  return `<ul class="evidence-list">${values.map((item) => {
    const href = evidenceHref(item.path, reportArtifactPath);
    const label = evidenceDisplayLabel(item);
    const meta = item.path && item.path !== label ? `<span class="evidence-path">${escapeHtml(item.path)}</span>` : "";
    const content = href
      ? `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
      : `<span>${escapeHtml(label)}</span>`;
    return `<li>${content}${meta}</li>`;
  }).join("")}</ul>`;
}

function htmlAnchorId(prefix, value) {
  return `${prefix}-${sanitizePathSegment(value, "item").toLowerCase()}`;
}

function severityBadge(severity) {
  const value = stringOrEmpty(severity) || "none";
  return `<span class="badge sev-${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function statusBadge(status) {
  const value = stringOrEmpty(status) || "not_run";
  return `<span class="badge st-${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function htmlCountsBar(counts, prefix) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (total === 0) return `<p>None recorded.</p>`;
  const segments = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const pct = Math.round((count / total) * 100);
      return `<div class="bar-seg ${prefix}-${escapeHtml(key)}" style="width:${pct}%" title="${escapeHtml(`${key}: ${count}`)}"><span>${escapeHtml(`${key} ${count}`)}</span></div>`;
    })
    .join("");
  return `<div class="bar">${segments}</div>`;
}

function htmlCountsTable(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return `<p>None recorded.</p>`;
  const rows = entries
    .map(([key, count]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(count)}</td></tr>`)
    .join("");
  return `<table><thead><tr><th>Key</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderHtmlReport(report) {
  const exec = report.executive_summary;
  const allFindings = report.scenarios.flatMap((scenario) => scenario.findings.map((item) => `${scenario.id}: ${item}`));
  const allBugs = report.scenarios.flatMap((scenario) => scenario.suspected_bugs.map((item) => `${scenario.id}: ${item}`));
  const allAccessibility = report.scenarios.flatMap((scenario) => scenario.accessibility_issues.map((item) => `${scenario.id}: ${item}`));
  const allConsoleErrors = report.scenarios.flatMap((scenario) => scenario.console_errors.map((item) => `${scenario.id}: ${item}`));

  const verdictClass = exec.verdict.toLowerCase().replace(/[^a-z]+/g, "-");
  const passRateLabel = exec.pass_rate === null ? "n/a" : `${exec.pass_rate}%`;
  const targetLabel = report.plan.name || report.plan.target.url || report.plan.target.app_area || "UX Gremlin Report";
  const evidenceCount = report.evidence.artifacts.length;
  const openIssueCount = report.top_issues.length;
  const openRiskCount = report.open_risks.length;
  const decisionLine = `${exec.verdict} | ${passRateLabel} pass rate | ${openIssueCount} top issue(s)`;
  const navItems = [
    ["Executive", "executive-summary"],
    ["Top Issues", "top-issues"],
    ["Scenarios", "scenario-index"],
    ["Rollup", "scenario-rollup"],
    ["Evidence", "evidence-library"],
    ["Risks", "open-risks"]
  ];
  const nav = `<nav class="report-nav" aria-label="Report sections">${navItems
    .map(([label, href]) => `<a href="#${href}">${escapeHtml(label)}</a>`)
    .join("")}</nav>`;
  const topIssuesRows = report.top_issues
    .map(
      (issue) => `<tr>
      <td>${severityBadge(issue.severity)}</td>
      <td>${statusBadge(issue.status)}</td>
      <td>${escapeHtml(`${issue.id}: ${issue.name}`)}</td>
      <td>${escapeHtml(issue.category)}</td>
      <td>${escapeHtml(issue.impact)}</td>
      <td>${escapeHtml(issue.recommended_action)}</td>
    </tr>`
    )
    .join("\n");
  const topIssues =
    report.top_issues.length > 0
      ? `<div class="table-wrap"><table><thead><tr><th>Severity</th><th>Status</th><th>Scenario</th><th>Category</th><th>Suspected Impact</th><th>Recommended Action</th></tr></thead><tbody>${topIssuesRows}</tbody></table></div>`
      : `<p>No open issues. Every executed scenario passed without suspected bugs or accessibility blockers.</p>`;

  const scenarioIndexRows = report.scenarios
    .map((scenario) => `<tr>
      <td><a href="#${escapeHtml(htmlAnchorId("scenario", scenario.id))}">${escapeHtml(scenario.id)}</a></td>
      <td>${escapeHtml(scenario.name)}</td>
      <td>${escapeHtml(scenario.category)}</td>
      <td>${severityBadge(scenario.severity)}</td>
      <td>${statusBadge(scenario.status)}</td>
      <td>${escapeHtml(scenario.findings.length)}</td>
      <td>${escapeHtml(scenario.evidence.length)}</td>
      <td>${escapeHtml(recommendedAction(scenario))}</td>
    </tr>`)
    .join("\n");
  const scenarioIndex = scenarioIndexRows
    ? `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Severity</th><th>Status</th><th>Findings</th><th>Evidence</th><th>Recommended Action</th></tr></thead><tbody>${scenarioIndexRows}</tbody></table></div>`
    : `<p>No scenarios recorded.</p>`;

  const trendItems = report.trend
    ? [
      `Compared with run from ${report.trend.previous_generated_at || "unknown"}.`,
      `Pass rate now ${report.trend.pass_rate ?? "n/a"}% (delta ${report.trend.pass_rate_delta ?? "n/a"}).`,
      `Suspected bugs now ${report.trend.suspected_bug_count} (delta ${report.trend.suspected_bug_delta}).`,
      `Accessibility issues now ${report.trend.accessibility_issue_count} (delta ${report.trend.accessibility_issue_delta}).`
    ]
    : ["No previous run recorded; this is the first tracked run."];

  const scenarioSections = report.scenarios.map((scenario) => `<section id="${escapeHtml(htmlAnchorId("scenario", scenario.id))}">
    <h3>${escapeHtml(`${scenario.id}: ${scenario.name}`)} ${severityBadge(scenario.severity)} ${statusBadge(scenario.status)}</h3>
    <p class="scenario-meta">${escapeHtml(scenario.evidence.length)} evidence artifact(s) · ${escapeHtml(scenario.findings.length)} finding(s)</p>
    <dl>
      <dt>Category</dt><dd>${escapeHtml(scenario.category)}</dd>
      <dt>Planned risk</dt><dd>${escapeHtml(scenario.risk_level)}</dd>
      <dt>Outcome</dt><dd>${escapeHtml(scenario.outcome)}</dd>
    </dl>
    <h4>Findings</h4>${htmlList(scenario.findings, "None recorded.")}
    <h4>Suspected Bugs</h4>${htmlList(scenario.suspected_bugs, "None recorded.")}
    <h4>Accessibility Issues</h4>${htmlList(scenario.accessibility_issues, "None recorded.")}
    <h4>Console Errors</h4>${htmlList(scenario.console_errors, "None recorded.")}
    <h4>Evidence</h4>${htmlEvidenceList(scenario.evidence, "None recorded.", report.artifacts.html)}
    <h4>Recovery Notes</h4>${htmlList(scenario.recovery_notes, "Pending execution.")}
  </section>`).join("\n");

  const evidenceGroups = report.scenarios
    .filter((scenario) => scenario.evidence.length > 0)
    .map((scenario) => `<section class="evidence-group">
      <h3><a href="#${escapeHtml(htmlAnchorId("scenario", scenario.id))}">${escapeHtml(`${scenario.id}: ${scenario.name}`)}</a></h3>
      ${htmlEvidenceList(scenario.evidence, "None recorded.", report.artifacts.html)}
    </section>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(`${targetLabel} | UX Gremlin Report`)}</title>
  <style>
    :root { color-scheme: light; --ink: #172033; --muted: #5b6472; --line: #d8dde6; --paper: #ffffff; --wash: #f6f8fb; --teal: #0f766e; --blue: #1d4ed8; --amber: #b45309; --red: #b91c1c; --green: #15803d; }
    body { background: var(--wash); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; margin: 0 auto; max-width: 1240px; padding: 1.25rem; }
    a { color: #0f766e; font-weight: 650; text-decoration-thickness: 0.08em; text-underline-offset: 0.18em; }
    a:focus-visible { outline: 3px solid #14b8a6; outline-offset: 2px; }
    h1, h2, h3 { color: #111827; letter-spacing: 0; }
    h1 { font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1.02; margin: 0.2rem 0 0.75rem; }
    h2 { margin-top: 0; }
    section { padding: 1rem 0; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
    dt { font-weight: 700; }
    code, pre { background: #f3f4f6; border-radius: 4px; padding: 0.1rem 0.25rem; }
    .report-nav { align-items: center; background: rgba(255,255,255,0.94); border: 1px solid var(--line); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; padding: 0.4rem; position: sticky; top: 0.5rem; z-index: 5; }
    .report-nav a { border-radius: 6px; color: var(--ink); padding: 0.35rem 0.55rem; text-decoration: none; }
    .report-nav a:hover { background: #eef6f5; color: var(--teal); }
    .hero { background: linear-gradient(135deg, #ffffff 0%, #f8fafc 56%, #eef6f5 100%); border: 1px solid var(--line); border-left: 8px solid var(--muted); border-radius: 8px; box-shadow: 0 18px 42px rgba(23,32,51,0.08); margin-bottom: 1rem; padding: 1.25rem; }
    .hero.verdict-pass { border-left-color: var(--green); }
    .hero.verdict-pass-with-risks { border-left-color: var(--amber); }
    .hero.verdict-fail { border-left-color: var(--red); }
    .hero.verdict-not-executed { border-left-color: var(--muted); }
    .eyebrow { color: var(--teal); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; margin: 0; text-transform: uppercase; }
    .decision-line { color: var(--ink); font-size: 1.1rem; font-weight: 760; margin: 0.4rem 0 1rem; }
    .run-strip { border-top: 1px solid var(--line); margin-top: 1rem; padding-top: 0.8rem; }
    .panel-section { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; margin: 1rem 0; padding: 1rem; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
    th, td { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; font-size: 0.95rem; }
    th { background: #f9fafb; position: sticky; top: 0; z-index: 1; }
    .cards { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.75rem 1rem; min-width: 9rem; }
    .metric-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); }
    .metric-card { background: rgba(255,255,255,0.82); border: 1px solid var(--line); border-radius: 8px; padding: 0.8rem; }
    .metric-card .label { color: var(--muted); font-size: 0.76rem; font-weight: 760; text-transform: uppercase; }
    .metric-card .value { color: var(--ink); font-size: 1.6rem; font-weight: 820; margin-top: 0.15rem; }
    .metric-card .note { color: var(--muted); font-size: 0.84rem; margin-top: 0.1rem; }
    .card .label { color: #6b7280; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .card .value { font-size: 1.4rem; font-weight: 700; }
    .verdict { display: inline-block; border-radius: 6px; padding: 0.35rem 0.75rem; font-weight: 700; color: #fff; }
    .verdict.verdict-pass { background: #15803d; }
    .verdict.verdict-pass-with-risks { background: #b45309; }
    .verdict.verdict-fail { background: #b91c1c; }
    .verdict.verdict-not-executed { background: #4b5563; }
    .badge { display: inline-block; border-radius: 999px; padding: 0.1rem 0.55rem; font-size: 0.78rem; font-weight: 700; color: #fff; }
    .sev-critical { background: #7f1d1d; } .sev-high { background: #b91c1c; } .sev-medium { background: #b45309; } .sev-low { background: #2563eb; } .sev-info, .sev-none { background: #6b7280; }
    .st-failed { background: #b91c1c; } .st-blocked { background: #7f1d1d; } .st-needs_review { background: #b45309; } .st-passed { background: #15803d; } .st-not_run { background: #6b7280; }
    .bar { display: flex; width: 100%; height: 1.5rem; border-radius: 6px; overflow: hidden; border: 1px solid #d1d5db; }
    .bar-seg { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.72rem; white-space: nowrap; min-width: 2.5rem; }
    .bar-seg span { padding: 0 0.25rem; }
    .scenario-meta { color: #4b5563; font-weight: 650; }
    .evidence-list { display: grid; gap: 0.45rem; padding-left: 1.2rem; }
    .evidence-list li { overflow-wrap: anywhere; }
    .evidence-path { color: #6b7280; display: block; font-size: 0.82rem; margin-top: 0.1rem; }
    .evidence-group { border-top: 1px dashed #d1d5db; padding-top: 0.75rem; }
    .st-passed, .sev-low { }
    @media (max-width: 720px) { body { padding: 0.75rem; } .report-nav { position: static; } dl { grid-template-columns: 1fr; } .card { min-width: 7rem; } }
    @media print { body { background: #fff; max-width: none; } .report-nav { display: none; } a { color: inherit; } th { position: static; } .hero, .panel-section { box-shadow: none; } }
  </style>
</head>
<body>
  ${nav}
  <section id="executive-summary" class="hero verdict-${escapeHtml(verdictClass)}">
    <h2>Executive Summary</h2>
    <p class="eyebrow">Executive UX Resilience Report</p>
    <h1>${escapeHtml(targetLabel)}</h1>
    <p><span class="verdict verdict-${escapeHtml(verdictClass)}">${escapeHtml(exec.verdict)}</span></p>
    <p class="decision-line">${escapeHtml(decisionLine)}</p>
    <div class="metric-grid" aria-label="Executive metrics">
      <div class="metric-card"><div class="label">Pass rate</div><div class="value">${escapeHtml(passRateLabel)}</div><div class="note">${escapeHtml(exec.executed_count)} of ${escapeHtml(report.summary.scenario_count)} scenarios executed</div></div>
      <div class="metric-card"><div class="label">Risk score</div><div class="value">${escapeHtml(exec.risk_score)}/100</div><div class="note">${severityBadge(exec.risk_band)}</div></div>
      <div class="metric-card"><div class="label">Top issues</div><div class="value">${escapeHtml(openIssueCount)}</div><div class="note">highest severity ${escapeHtml(exec.highest_open_severity)}</div></div>
      <div class="metric-card"><div class="label">Evidence</div><div class="value">${escapeHtml(evidenceCount)}</div><div class="note">linked artifact(s)</div></div>
      <div class="metric-card"><div class="label">Suspected bugs</div><div class="value">${escapeHtml(exec.suspected_bug_count)}</div><div class="note">${escapeHtml(exec.accessibility_blocker_count)} accessibility blocker(s)</div></div>
      <div class="metric-card"><div class="label">Open risks</div><div class="value">${escapeHtml(openRiskCount)}</div><div class="note">result-specific risk note(s)</div></div>
    </div>
    <dl class="run-strip">
      <dt>Target</dt><dd>${escapeHtml(report.plan.name || report.plan.target.url || report.plan.target.app_area || "(unnamed)")}</dd>
      <dt>Environment</dt><dd>${escapeHtml(report.run.environment || report.plan.target.environment || "(not set)")}</dd>
      <dt>Executed at</dt><dd>${escapeHtml(report.run.executed_at || "(not executed)")}${report.run.executor ? escapeHtml(` by ${report.run.executor}`) : ""}</dd>
      <dt>Build / commit</dt><dd>${escapeHtml(report.run.build || "(n/a)")}${report.run.commit ? escapeHtml(` / ${report.run.commit}`) : ""}</dd>
    </dl>
  </section>
  <section id="trend" class="panel-section">
    <h2>Trend</h2>
    ${htmlList(trendItems, "No previous run recorded.")}
  </section>
  <section id="top-issues" class="panel-section">
    <h2>Top Issues &amp; Recommended Actions</h2>
    ${topIssues}
  </section>
  <section id="scenario-index" class="panel-section">
    <h2>Scenario Index</h2>
    ${scenarioIndex}
  </section>
  <section id="scenario-rollup" class="panel-section">
    <h2>Scenario Rollup</h2>
    <p>Total scenarios: ${escapeHtml(report.summary.scenario_count)}</p>
    <h3>Status</h3>
    ${htmlCountsBar(report.summary.status_counts, "st")}
    ${htmlCountsTable(report.summary.status_counts)}
    <h3>Severity</h3>
    ${htmlCountsBar(report.summary.severity_counts, "sev")}
    ${htmlCountsTable(report.summary.severity_counts)}
    <h3>Category</h3>
    ${htmlCountsTable(report.summary.category_counts)}
  </section>
  <section id="target" class="panel-section">
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
  <section id="baseline-flow" class="panel-section">
    <h2>Baseline Flow</h2>
    ${htmlList(report.baseline_flow.steps.map((step, index) => `${index + 1}. ${step}`), "No baseline steps recorded.")}
    <p>Expected result: ${escapeHtml(report.baseline_flow.expected_result)}</p>
  </section>
  <section id="scenarios-tested" class="panel-section">
    <h2>Scenarios Tested</h2>
    ${scenarioSections || "<p>No scenario details recorded.</p>"}
  </section>
  <section id="evidence-library" class="panel-section">
    <h2>Evidence Library</h2>
    ${evidenceGroups || "<p>Pending execution.</p>"}
  </section>
  <section id="findings" class="panel-section">
    <h2>Findings</h2>
    ${htmlList(allFindings, "Pending execution.")}
  </section>
  <section id="bugs-suspected" class="panel-section">
    <h2>Bugs Suspected</h2>
    ${htmlList(allBugs, "Pending execution.")}
  </section>
  <section id="accessibility-issues" class="panel-section">
    <h2>Accessibility Issues</h2>
    ${htmlList(allAccessibility, "Pending keyboard, focus, ARIA, and screen-reader validation.")}
  </section>
  <section id="console-errors" class="panel-section">
    <h2>Console Errors</h2>
    ${htmlList(allConsoleErrors, "Pending execution.")}
  </section>
  <section id="executed-commands" class="panel-section">
    <h2>Executed Commands</h2>
    ${htmlList(report.executed_commands, "Pending execution.")}
  </section>
  <section id="open-risks" class="panel-section">
    <h2>Open Risks</h2>
    ${htmlList(report.open_risks, "No result-specific risks recorded.")}
  </section>
</body>
</html>
`;
}

function renderJUnitReport(report) {
  const failureStatuses = new Set(["failed", "blocked"]);
  const skippedStatuses = new Set(["not_run", "needs_review"]);
  const failures = report.scenarios.filter((scenario) => failureStatuses.has(scenario.status)).length;
  const skipped = report.scenarios.filter((scenario) => skippedStatuses.has(scenario.status)).length;
  const cases = report.scenarios
    .map((scenario) => {
      const name = escapeHtml(`${scenario.id}: ${scenario.name}`);
      const classname = escapeHtml(scenario.category || "ux-gremlin");
      if (failureStatuses.has(scenario.status)) {
        const message = escapeHtml(
          scenario.suspected_bugs[0] || scenario.findings[0] || scenario.outcome || scenario.status
        );
        return `  <testcase classname="${classname}" name="${name}"><failure message="${message}" type="${escapeHtml(scenario.status)}">${escapeHtml(`severity=${scenario.severity}; ${scenario.outcome}`)}</failure></testcase>`;
      }
      if (skippedStatuses.has(scenario.status)) {
        return `  <testcase classname="${classname}" name="${name}"><skipped message="${escapeHtml(scenario.status)}"/></testcase>`;
      }
      return `  <testcase classname="${classname}" name="${name}"/>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="ux-gremlin" tests="${report.summary.scenario_count}" failures="${failures}" skipped="${skipped}">
  <testsuite name="${escapeHtml(report.plan.name || "UX Gremlin")}" tests="${report.summary.scenario_count}" failures="${failures}" skipped="${skipped}" timestamp="${escapeHtml(report.run.executed_at || report.generated_at)}">
${cases}
  </testsuite>
</testsuites>
`;
}

function renderPrComment(report) {
  const exec = report.executive_summary;
  const verdictEmoji = {
    Pass: "✅",
    "Pass with risks": "⚠️",
    Fail: "❌",
    "Not executed": "⏳"
  };
  const topIssues = report.top_issues.slice(0, 5);
  const issuesTable = mdTable(
    ["Severity", "Status", "Scenario", "Recommended Action"],
    topIssues.map((issue) => [issue.severity, issue.status, `${issue.id}: ${issue.name}`, issue.recommended_action]),
    "No open issues."
  );
  return `### UX Gremlin: ${verdictEmoji[exec.verdict] || ""} ${exec.verdict}

- Pass rate: ${exec.pass_rate === null ? "n/a (not executed)" : `${exec.pass_rate}%`} (${exec.executed_count}/${report.summary.scenario_count} executed)
- Risk score: ${exec.risk_score}/100 (${exec.risk_band}) · Highest severity: ${exec.highest_open_severity}
- Suspected bugs: ${exec.suspected_bug_count} · Accessibility blockers: ${exec.accessibility_blocker_count}

#### Top issues

${issuesTable}
`;
}

function loadHistory(historyPath) {
  if (!fs.existsSync(historyPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function computeTrend(report, history) {
  const previous = history.length > 0 ? history[history.length - 1] : null;
  const current = {
    generated_at: report.generated_at,
    pass_rate: report.executive_summary.pass_rate,
    suspected_bug_count: report.executive_summary.suspected_bug_count,
    accessibility_issue_count: report.summary.accessibility_issue_count,
    verdict: report.executive_summary.verdict
  };
  if (!previous) return { current, trend: null };
  const delta = (now, before) => (now == null || before == null ? null : now - before);
  return {
    current,
    trend: {
      previous_generated_at: previous.generated_at || "unknown",
      pass_rate: current.pass_rate,
      pass_rate_delta: delta(current.pass_rate, previous.pass_rate),
      suspected_bug_count: current.suspected_bug_count,
      suspected_bug_delta: delta(current.suspected_bug_count, previous.suspected_bug_count) ?? 0,
      accessibility_issue_count: current.accessibility_issue_count,
      accessibility_issue_delta: delta(current.accessibility_issue_count, previous.accessibility_issue_count) ?? 0
    }
  };
}

function highestIssueSeverity(report) {
  const severities = report.scenarios
    .filter(
      (scenario) =>
        ["failed", "blocked", "needs_review"].includes(scenario.status) ||
        scenario.suspected_bugs.length > 0 ||
        scenario.accessibility_issues.length > 0
    )
    .map((scenario) => scenario.severity);
  return maxSeverity(severities);
}

function commandReport(planPath, resultsPath, outDirArg, options = {}) {
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

  // Only executed runs contribute to history so plan-only reports stay deterministic.
  const useHistory = options.history !== false && Boolean(results);
  const historyPath = path.join(outDir, "history.json");
  if (useHistory) {
    const history = loadHistory(historyPath);
    const { current, trend } = computeTrend(report, history);
    report.trend = trend;
    history.push(current);
    fs.writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`, "utf-8");
  }

  fs.writeFileSync(artifacts.markdown, renderMarkdownReport(report), "utf-8");
  fs.writeFileSync(artifacts.json, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  fs.writeFileSync(artifacts.html, renderHtmlReport(report), "utf-8");
  fs.writeFileSync(artifacts.junit, renderJUnitReport(report), "utf-8");
  fs.writeFileSync(artifacts.pr, renderPrComment(report), "utf-8");
  console.log(`Wrote ${artifacts.markdown}`);
  console.log(`Wrote ${artifacts.json}`);
  console.log(`Wrote ${artifacts.html}`);
  console.log(`Wrote ${artifacts.junit}`);
  console.log(`Wrote ${artifacts.pr}`);

  if (options.failOn) {
    applyGate(report, options.failOn);
  }
}

function applyGate(report, failOn) {
  const threshold = failOn || "high";
  if (!allowedResultSeverities.has(threshold)) {
    console.error(`ERROR: --fail-on must be one of: ${[...allowedResultSeverities].join(", ")}`);
    process.exit(2);
  }
  const highest = highestIssueSeverity(report);
  if (highest && severityAtLeast(highest, threshold)) {
    console.error(
      `GATE FAIL: highest open severity ${highest} is at or above threshold ${threshold} (verdict: ${report.executive_summary.verdict}).`
    );
    process.exit(1);
  }
  console.log(`GATE PASS: highest open severity ${highest || "none"} is below threshold ${threshold}.`);
}

function commandGate(planPath, resultsPath, failOn) {
  const plan = readPlan(planPath);
  const planErrors = validatePlan(plan);
  if (planErrors.length > 0) {
    printErrors(planErrors);
    process.exit(1);
  }
  if (!resultsPath) {
    console.error("ERROR: gate requires --results <path>");
    process.exit(2);
  }
  const results = readResults(resultsPath);
  const resultErrors = validateResults(results, plan);
  if (resultErrors.length > 0) {
    printErrors(resultErrors);
    process.exit(1);
  }
  const report = normalizeReport(plan, results, resolveReportDir(plan, null));
  applyGate(report, failOn || "high");
}

const args = parseArgs(process.argv);
const planPath = resolvePlanPath(args.plan);

try {
  if (args.command === "init") commandInit();
  else if (args.command === "check") commandCheck(planPath);
  else if (args.command === "coverage") commandCoverage(planPath);
  else if (args.command === "summary") commandSummary(planPath);
  else if (args.command === "workflow-status") {
    commandWorkflowStatus(planPath, args.phase, {
      input: args.input,
      results: args.results
    });
  }
  else if (args.command === "generate-playwright") commandGeneratePlaywright(planPath);
  else if (args.command === "ingest") commandIngest(planPath, args.input, args.axe, args.out);
  else if (args.command === "report") {
    commandReport(planPath, args.results ? path.resolve(args.results) : null, args.outDir, {
      failOn: args.failOn,
      history: args.history
    });
  } else if (args.command === "gate") {
    commandGate(planPath, args.results ? path.resolve(args.results) : null, args.failOn);
  } else usage(2);
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
