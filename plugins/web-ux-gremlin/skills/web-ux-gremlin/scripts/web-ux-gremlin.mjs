#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, "..");
const defaultYamlPlan = ".agent/session/web-ux-gremlin-plan.yaml";
const defaultJsonPlan = ".agent/session/web-ux-gremlin-plan.json";
const templatePath = path.join(skillDir, "templates", "web-ux-gremlin-plan.yaml");
const outputSpecPath = ".agent/generated/web-ux-gremlin.spec.ts";
const defaultReportDir = ".agent/reports/web-ux-gremlin";
const defaultIngestOut = ".agent/session/web-ux-gremlin-results.json";
const defaultWorkflowStatePath = ".agent/session/web-ux-gremlin-workflow.json";
const defaultMcpStatePath = ".agent/session/web-ux-gremlin-mcp-state.json";
const defaultRunReportPath = ".agent/session/web-ux-gremlin-playwright-report.json";
const baselineTestTitle = "baseline happy path";

const canonicalExecutionModes = new Set(["cli", "mcp"]);
const publicExecutionModeAliases = new Set(["playwright-cli", "playwright-mcp"]);
const legacyExecutionModes = new Set(["playwright_cli", "playwright_mcp", "agent_browser", "manual_checklist"]);
const deprecatedExecutionModeAliases = new Set(["playwright_cli", "playwright_mcp"]);
const allowedPlanModes = new Set([...canonicalExecutionModes, ...publicExecutionModeAliases, ...legacyExecutionModes]);
const executionAliases = new Map([
  ["playwright-cli", "cli"],
  ["playwright-mcp", "mcp"],
  ["playwright_cli", "cli"],
  ["playwright_mcp", "mcp"]
]);
const executionModes = new Set([...canonicalExecutionModes, ...publicExecutionModeAliases, ...legacyExecutionModes]);
const allowedWorkflowModes = new Set(["manual", "guided", "auto"]);
const allowedRiskLevels = new Set(["low", "medium", "high", "critical"]);
const allowedResultStatuses = new Set(["passed", "failed", "blocked", "not_run", "needs_review"]);
const allowedResultSeverities = new Set(["info", "low", "medium", "high", "critical"]);
const workflowPhases = ["init", "plan", "generate", "execute", "report"];
const phaseIndexByName = new Map(workflowPhases.map((phase, index) => [phase, index]));

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
  "ordering_flip",
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
  "long_running_operation",
  "backtracking",
  "delayed_assertion",
  "invalid_input_mutation"
]);

const autoScenarioTemplates = [
  {
    category: "invalid_input_mutation",
    name: "Invalid boundary inputs with mutation",
    risk_level: "medium",
    purpose: "Detect hidden validation gaps when boundary values and invalid fields are changed late in the flow.",
    steps: [
      "Run baseline steps using a boundary value and then clear or mutate a required value before submit.",
      "Submit and observe whether the flow preserves data safely.",
      "Check if the app explains why the action is blocked."
    ],
    expected_behavior: "The app rejects invalid data and preserves useful context.",
    assertions: [
      "The flow is blocked with an explicit validation result.",
      "No duplicate or partial objects are created."
    ],
    recovery_expectation: "The user can fix the boundary/required input and restart without stale corrupt state."
  },
  {
    category: "ordering_flip",
    name: "Ordering flip after partial completion",
    risk_level: "medium",
    purpose: "Verify ordering assumptions do not leak across steps when users revisit or reorder actions.",
    steps: [
      "Perform partial baseline steps.",
      "Submit step inputs in an unusual order (e.g., confirm/next before a dependent field).",
      "Attempt to recover to a valid state."
    ],
    expected_behavior: "The app prevents out-of-order progression and keeps state consistent.",
    assertions: [
      "The flow does not submit or mutate state from an invalid sequence.",
      "A clear recovery path is visible."
    ],
    recovery_expectation: "The user can restart or reorder to the correct sequence without silent corruption."
  },
  {
    category: "rapid_clicking",
    name: "Rapid repeated interactions",
    risk_level: "medium",
    purpose: "Detect races and duplicate requests from rapid repeated interaction in a single session.",
    steps: [
      "Replay the core action in baseline flow using repeated quick interactions.",
      "Observe system behavior for duplicate request side effects.",
      "Verify user can recover to a clear state after completion."
    ],
    expected_behavior: "The app coalesces duplicate actions and avoids duplicate side effects.",
    assertions: [
      "The user sees stable state without duplicate mutations.",
      "No duplicate object is created from repeated interactions."
    ],
    recovery_expectation: "If repeated actions were sent, the app exposes a clear recovery path and current state remains correct."
  },
  {
    category: "backtracking",
    name: "Backtracking after partial completion",
    risk_level: "medium",
    purpose: "Confirm backtracking through form/wizard steps preserves or resets state safely.",
    steps: [
      "Perform partial baseline actions until after data entry.",
      "Navigate backward and then re-enter the flow from a previous step.",
      "Attempt to continue and complete the flow."
    ],
    expected_behavior: "The app does not reuse stale or inconsistent partial state and does not duplicate submissions.",
    assertions: ["Navigation back clears stale state or surfaces explicit recovery guidance."],
    recovery_expectation: "Users can resume with explicit state or start cleanly without corruption."
  },
  {
    category: "delayed_assertion",
    name: "Delayed assertion timing",
    risk_level: "medium",
    purpose: "Expose race-like timing and delayed state rendering where assertions are checked too late.",
    steps: [
      "Run baseline steps and wait for asynchronous UI state transitions.",
      "Delay final assertions to capture stale or flickering status.",
      "Reload and confirm persisted behavior."
    ],
    expected_behavior: "UI state remains coherent and user-facing outcomes are not duplicated or ambiguous.",
    assertions: [
      "State does not oscillate into contradictory values after transition.",
      "The user sees a single, stable end state."
    ],
    recovery_expectation: "The flow offers a simple retry or clear state action when async timing completes."
  },
  {
    category: "session_storage_clear",
    name: "Session storage clear while authenticated",
    risk_level: "high",
    purpose: "Validate continuation behavior when storage is lost mid-flow.",
    steps: [
      "Run baseline flow to collect user-entered state in session storage.",
      "Clear session storage.",
      "Refresh and continue the flow or recover to the start."
    ],
    expected_behavior: "The app does not crash and provides recovery/ restart semantics.",
    assertions: ["No silent failure occurs after storage clear."],
    recovery_expectation: "User can resume from a consistent checkpoint or cleanly restart."
  }
];

function usage(exitCode = 2) {
  const out = exitCode === 0 ? console.log : console.error;
  out(`Usage: node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs <command> [options]

Commands:
  init                 Create .agent/session/web-ux-gremlin-plan.yaml and report dir if missing.
  check                Validate a UX Gremlin plan (includes coverage enforcement).
  coverage             Report flow-type category gaps and declared-condition warnings.
  summary              Print a concise markdown summary.
  generate             Generate runnable .agent/generated/web-ux-gremlin.spec.ts.
  generate-playwright   Back-compat alias for generate.
  run                  Execute the generated spec in CLI or MCP mode.
  workflow-status      Read or set workflow phase metadata.
  ingest               Convert a Playwright JSON report (+optional axe) into a results file.
  report               Create or update report.md, report.json, report.html, report.junit.xml, and report.pr.md.
  gate                 Exit non-zero when results contain an issue at or above --fail-on severity.

Options:
  --plan <path>        Plan file (defaults to ${defaultYamlPlan}, then ${defaultJsonPlan}).
  --workflow <value>   Workflow mode for check/generate/report commands.
                       One of manual|guided|auto. Defaults to manual or plan.workflow.mode.
  --mode <value>       Execution mode for run/report/ingest/check/commands.
                       One of playwright-cli|playwright-mcp|cli|mcp (default cli).
  --results <path>     Executed results file for report/gate.
  --phase <phase>      workflow phase for workflow-status.
  --phase-dry-run      Set workflow phase without validation (used by workflow-status).
  --out-dir <path>     Report output directory (defaults to reporting.output_dir, then ${defaultReportDir}).
  --input <path>       Playwright JSON report consumed by ingest.
  --axe <path>         Optional axe-core JSON consumed by ingest.
  --out <path>         Output results file for ingest (defaults to ${defaultIngestOut}).
  --run-report <path>   Location for CLI/MCP raw run output (default ${defaultRunReportPath}).
  --fail-on <severity> Severity gate threshold for report/gate (info|low|medium|high|critical; default high).
  --dry-run            Print run command and exit without executing.
  --mcp-command <path> Override MCP executable command.
  --mcp-state <path>   MCP state file for mode playwright-mcp or mcp.
  --no-history         Do not read or append run history during report.
  --no-update-plan      generate-run does not write auto-scenario updates back to plan.
  --skip-phase-check    Skip phase validation for ad-hoc/manual recoveries.

YAML support is intentionally conservative and supports the template shape used by this plugin.
JSON is supported as a fallback at ${defaultJsonPlan}.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    command: argv[2],
    plan: null,
    workflow: null,
    mode: null,
    phase: null,
    results: null,
    outDir: null,
    input: null,
    axe: null,
    out: null,
    runReport: null,
    failOn: null,
    dryRun: false,
    mcpCommand: null,
    mcpStatePath: null,
    updatePlan: true,
    skipPhaseCheck: false,
    phaseDryRun: false,
    history: true
  };
  const valueFlags = {
    "--plan": "plan",
    "--workflow": "workflow",
    "--mode": "mode",
    "--phase": "phase",
    "--results": "results",
    "--out-dir": "outDir",
    "--input": "input",
    "--axe": "axe",
    "--out": "out",
    "--run-report": "runReport",
    "--fail-on": "failOn",
    "--mcp-command": "mcpCommand",
    "--mcp-state": "mcpStatePath"
  };
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-history") {
      args.history = false;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--no-update-plan") {
      args.updatePlan = false;
    } else if (arg === "--skip-phase-check") {
      args.skipPhaseCheck = true;
    } else if (arg === "--phase-dry-run") {
      args.phaseDryRun = true;
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
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);
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

function dumpYaml(value, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);
  if (value === null || value === undefined) return "null";
  if (value === true || value === false) return String(value);
  if (Number.isFinite(value) && typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value === "") return "\"\"";
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((entry) => `${indent}- ${dumpYaml(entry, indentLevel + 1)}`)
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, entryValue]) => {
        const rendered = dumpYaml(entryValue, indentLevel + 1);
        if (rendered.includes("\n")) {
          return `${indent}${key}:\n${rendered
            .split("\n")
            .map((line) => `  ${line}`)
            .join("\n")}`;
        }
        return `${indent}${key}: ${rendered}`;
      })
      .join("\n");
  }
  return String(value);
}

function normalizeExecutionMode(rawMode, fallback = "cli") {
  if (!rawMode) return fallback;
  const normalizedAlias = executionAliases.get(rawMode);
  const normalizedMode = normalizedAlias ?? rawMode;
  if (executionModes.has(normalizedMode)) return normalizedMode;
  throw new Error(`execution mode must be one of: ${[...canonicalExecutionModes, ...publicExecutionModeAliases, ...legacyExecutionModes].join(", ")}`);
}

function normalizeRequestedExecutionMode(rawMode, fallback = "cli") {
  if (!rawMode) return fallback;
  const resolved = normalizeExecutionMode(rawMode, fallback);
  if (deprecatedExecutionModeAliases.has(rawMode)) {
    console.warn(`WARN: execution mode ${rawMode} is deprecated; using ${resolved}.`);
  }
  return resolved;
}

function normalizeWorkflowMode(planMode, cliMode) {
  if (cliMode) {
    if (!allowedWorkflowModes.has(cliMode)) {
      throw new Error(`--workflow must be one of: ${[...allowedWorkflowModes].join(", ")}`);
    }
    return cliMode;
  }
  const inferred = typeof planMode === "string" ? planMode : "manual";
  if (!allowedWorkflowModes.has(inferred)) return "manual";
  return inferred;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file is missing: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`${label} must be valid JSON: ${err.message}`);
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function writeYaml(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${dumpYaml(value)}\n`, "utf-8");
}

function readWorkflowState(statePath = defaultWorkflowStatePath) {
  if (!fs.existsSync(statePath)) {
    return { phase: "init", lastUpdated: null, phaseHistory: [] };
  }
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    if (state && typeof state === "object") return state;
  } catch {
    return { phase: "init", lastUpdated: null, phaseHistory: [] };
  }
  return { phase: "init", lastUpdated: null, phaseHistory: [] };
}

function saveWorkflowState(state, statePath = defaultWorkflowStatePath) {
  writeJson(statePath, state);
}

function setWorkflowPhase(phase, statePath = defaultWorkflowStatePath) {
  const state = readWorkflowState(statePath);
  const previous = state.phase || "init";
  if (previous !== phase) {
    state.phase = phase;
    state.lastUpdated = new Date().toISOString();
    state.phaseHistory = [...(state.phaseHistory || []), { phase, at: state.lastUpdated }];
    state.phaseHistory = state.phaseHistory.slice(-30);
    saveWorkflowState(state, statePath);
  }
}

function assertWorkflowPhase(minimumPhase, context, args = {}) {
  if (args.skipPhaseCheck) return;
  const current = phaseIndexByName.get(readWorkflowState().phase || "init") ?? 0;
  const required = phaseIndexByName.get(minimumPhase);
  if (required == null) {
    return;
  }
  if (current < required) {
    console.error(`ERROR: ${context} requires workflow phase ${minimumPhase} or later (current=${readWorkflowState().phase || "init"}).`);
    process.exit(2);
  }
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

  if (!allowedPlanModes.has(plan.mode)) {
    errors.push(`mode must be one of: ${[...allowedPlanModes].join(", ")}`);
  }
  if (plan.workflow != null) {
    if (typeof plan.workflow !== "object" || Array.isArray(plan.workflow)) {
      errors.push("workflow must be an object");
    } else {
      if (plan.workflow.mode != null && !allowedWorkflowModes.has(plan.workflow.mode)) {
        errors.push(`workflow.mode must be one of: ${[...allowedWorkflowModes].join(", ")}`);
      }
      if (
        plan.workflow.risk_tolerance != null &&
        !allowedRiskLevels.has(plan.workflow.risk_tolerance)
      ) {
        errors.push(`workflow.risk_tolerance must be one of: ${[...allowedRiskLevels].join(", ")}`);
      }
      if (
        plan.workflow.mutation_depth != null &&
        (!Number.isInteger(plan.workflow.mutation_depth) ||
          plan.workflow.mutation_depth < 1 ||
          plan.workflow.mutation_depth > 5)
      ) {
        errors.push("workflow.mutation_depth must be an integer between 1 and 5");
      }
      if (plan.workflow.objectives != null && !isStringArray(plan.workflow.objectives)) {
        errors.push("workflow.objectives must be an array of strings");
      }
      if (plan.workflow.target_urls != null && !isStringArray(plan.workflow.target_urls)) {
        errors.push("workflow.target_urls must be an array of strings");
      }
    }
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

function workflowSummary(plan, workflowMode) {
  const workflow = normalizeWorkflowMode(plan?.workflow?.mode, workflowMode);
  return {
    mode: workflow,
    target_urls: isStringArray(plan?.workflow?.target_urls) ? plan.workflow.target_urls : [],
    objectives: isStringArray(plan?.workflow?.objectives) ? plan.workflow.objectives : [],
    risk_tolerance: isNonEmptyString(plan?.workflow?.risk_tolerance) && allowedRiskLevels.has(plan.workflow.risk_tolerance)
      ? plan.workflow.risk_tolerance
      : "medium",
    mutation_depth: Number.isFinite(plan?.workflow?.mutation_depth)
      ? plan.workflow.mutation_depth
      : isFinite(plan?.workflow?.mutation_depth)
        ? Number(plan.workflow.mutation_depth)
        : 3
  };
}

function commandInit(planPath) {
  ensureDir(path.dirname(planPath));
  ensureDir(path.dirname(defaultReportDir));
  if (!fs.existsSync(planPath)) {
    fs.copyFileSync(templatePath, planPath);
    console.log(`Created ${planPath}`);
  } else {
    console.log(`Exists ${planPath}`);
  }
  setWorkflowPhase("init");
  console.log(`Ready ${defaultReportDir}`);
}

async function commandWorkflowStatus(args) {
  const state = readWorkflowState();
  if (args.phase) {
    const nextPhase = args.phase;
    if (!workflowPhases.includes(nextPhase)) {
      console.error(`ERROR: invalid workflow phase ${nextPhase}. expected one of: ${workflowPhases.join(", ")}`);
      process.exit(2);
    }
    const resolvedCurrent = readWorkflowState();
    if (!args.phaseDryRun && phaseIndexByName.get(nextPhase) < phaseIndexByName.get(resolvedCurrent.phase || "init")) {
      console.error(`ERROR: cannot move workflow phase backwards from ${resolvedCurrent.phase || "init"} to ${nextPhase}`);
      process.exit(2);
    }
    setWorkflowPhase(nextPhase);
    if (args.dryRun) {
      console.log(`[dry-run] set phase ${nextPhase}`);
    } else {
      console.log(`Phase set to ${nextPhase}`);
    }
    return;
  }
  const next = {
    phase: state.phase || "init",
    lastUpdated: state.lastUpdated || null,
    phaseHistory: state.phaseHistory || []
  };
  console.log(JSON.stringify(next, null, 2));
}

function commandCheck(planPath, workflowMode, cliMode) {
  let plan;
  try {
    plan = readPlan(planPath);
    const rawPlanMode = plan.mode;
    if (allowedPlanModes.has(rawPlanMode)) {
      plan = { ...plan, mode: normalizeExecutionMode(rawPlanMode, "cli") };
    }
    const requestedMode = cliMode ? normalizeRequestedExecutionMode(cliMode, "cli") : plan.mode;
    if (cliMode && requestedMode !== plan.mode) {
      console.warn(`WARN: --mode override (${requestedMode}) does not match plan mode (${plan.mode}); planning checks use canonical plan mode.`);
    }
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
  const workflow = workflowSummary(plan, workflowMode);
  console.log(`OK: ${planPath}`);
  console.log(`Workflow mode: ${workflow.mode}`);
  console.log(`Execution mode: ${plan.mode}`);
  setWorkflowPhase("plan");
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
  const executionMode = normalizeExecutionMode(plan.mode, "cli");
  const highRisk = (plan.gremlin_scenarios ?? []).filter((scenario) => scenario.risk_level === "high" || scenario.risk_level === "critical");
  console.log(`# UX Gremlin Summary

- Plan: ${plan.name || "(unnamed)"}
- Target URL: ${plan.target?.url || "(not set)"}
- Execution mode: ${executionMode}
- Baseline steps: ${(plan.baseline_flow?.steps ?? []).length}
- Scenario count: ${(plan.gremlin_scenarios ?? []).length}
- Scenario categories: ${scenarioCategories(plan).join(", ") || "(none)"}
- High/critical scenarios: ${highRisk.map((scenario) => scenario.id).join(", ") || "(none)"}
- Accessibility checks: keyboard=${Boolean(plan.accessibility_checks?.keyboard_only)}, focus=${Boolean(plan.accessibility_checks?.focus_management)}, aria=${Boolean(plan.accessibility_checks?.aria_semantics)}
- Verification commands: ${(plan.verification_commands ?? []).join(" ; ") || "(none)"}`);
}

function isGuidedWorkflowEnabled(mode, cliWorkflow) {
  return normalizeWorkflowMode(mode, cliWorkflow) === "guided";
}

async function readGuidedWorkflow(promptedWorkflow) {
  if (!promptedWorkflow) return {};
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return {};
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (question) => {
    const value = await rl.question(`${question} `);
    return String(value || "").trim();
  };
  try {
    const focus = await ask("Which target URLs should this workflow focus on first (comma-separated, optional)?");
    const objectives = await ask("List objective(s) as comma-separated items (optional):");
    const risk = await ask("Choose risk tolerance (low, medium, high):");
    const depth = await ask("Mutation depth (1-5, default 3):");
    const depthValue = Number.parseInt(depth || "3", 10);
    return {
      workflow: {
        target_urls: focus
          ? focus
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
          : [],
        objectives: objectives ? objectives.split(",").map((entry) => entry.trim()).filter(Boolean) : [],
        risk_tolerance: isNonEmptyString(risk) && allowedRiskLevels.has(risk) ? risk : "medium",
        mutation_depth: Number.isFinite(depthValue) ? Math.min(5, Math.max(1, depthValue)) : 3
      }
    };
  } finally {
    await rl.close();
  }
}

function autoScenariosForWorkflow(plan, mode) {
  if (mode !== "auto") return plan.gremlin_scenarios ?? [];
  const planned = new Set((plan.gremlin_scenarios ?? []).map((scenario) => scenario?.category));
  const additions = autoScenarioTemplates
    .filter((entry) => !planned.has(entry.category))
    .map((entry, index) => {
      const id = `${entry.category}-auto-${index + 1}`;
      return {
        id,
        name: entry.name,
        category: entry.category,
        risk_level: entry.risk_level,
        purpose: entry.purpose,
        preconditions: plan.baseline_flow?.preconditions ?? [],
        steps: entry.steps,
        expected_behavior: entry.expected_behavior,
        assertions: entry.assertions,
        bug_indicators: ["Potential duplicate state transitions or stale state should be considered as a bug."],
        recovery_expectation: entry.recovery_expectation,
        playwright_notes: "Prefer role-based locators; avoid hidden selectors.",
        accessibility_notes: "Capture focus and status changes when state resets.",
      };
    });
  return [...(plan.gremlin_scenarios ?? []), ...additions];
}

function assertNoImplementationGaps(specPath, allowTodo = false) {
  if (allowTodo) return;
  if (!fs.existsSync(specPath)) {
    throw new Error(`generated spec missing: ${specPath}`);
  }
  const source = fs.readFileSync(specPath, "utf-8");
  if (source.includes("function requireImplementation") || source.includes("TODO: implement with role-based locators")) {
    throw new Error("generated spec contains unimplemented placeholders. Finish requireImplementation() blocks or set WEB_UX_GREMLIN_ALLOW_TODO=true");
  }
}

function commandGenerate(planPath, options = {}) {
  const plan = readPlan(planPath);
  const workflowMode = normalizeWorkflowMode(plan.workflow?.mode, options.workflow);
  const planMode = normalizeRequestedExecutionMode(options.mode || plan.mode, "cli");
  const normalized = { ...plan, mode: planMode };
  if (isGuidedWorkflowEnabled(plan.workflow?.mode, options.workflow)) {
    return readGuidedWorkflow(true).then((guided) => {
      const workflow = { ...normalized.workflow, ...guided.workflow, mode: workflowMode };
      const merged = { ...normalized, workflow };
      const finalPlan = {
        ...merged,
        gremlin_scenarios: autoScenariosForWorkflow(merged, workflow.mode)
      };
      const errors = validatePlan(finalPlan);
      if (errors.length > 0) {
        printErrors(errors);
        process.exit(1);
      }
      if (options.workflow === "auto" && options.updatePlan) {
        writeYaml(planPath, finalPlan);
      }
      writeGeneratedSpec(finalPlan);
      setWorkflowPhase("generate");
    });
  }
  const finalPlan = {
    ...normalized,
    workflow: { ...(normalized.workflow ?? {}), mode: workflowMode },
    gremlin_scenarios: autoScenariosForWorkflow(normalized, workflowMode)
  };
  const errors = validatePlan(finalPlan);
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  if (options.workflow === "auto" && options.updatePlan) {
    writeYaml(planPath, finalPlan);
  }
  writeGeneratedSpec(finalPlan);
  setWorkflowPhase("generate");
}

function commandGeneratePlaywright(planPath, options = {}) {
  return commandGenerate(planPath, options);
}

function executionCommandDescription(planMode, args = {}) {
  const runReportPath = path.resolve(args.runReport || defaultRunReportPath);
  if (planMode === "mcp") {
    const mcpCommand = args.mcpCommand || "playwright-mcp";
    const statePath = path.resolve(args.mcpStatePath || defaultMcpStatePath);
    return {
      command: mcpCommand,
      args: ["run", outputSpecPath, "--state", statePath, "--reporter", `json:${path.resolve(args.runReport || defaultRunReportPath)}`],
      mode: "mcp",
      description: `playwright-mcp explorer using state ${statePath}`
    };
  }
  return {
    command: "npx",
    args: ["playwright", "test", outputSpecPath, "--reporter", `json:${runReportPath}`],
    mode: "cli",
    description: "Playwright CLI execution via npx"
  };
}

function parseReportMode(rawMode) {
  if (!rawMode) return "cli";
  const normalized = normalizeRequestedExecutionMode(rawMode, "cli");
  if (normalized !== "cli" && normalized !== "mcp") {
    throw new Error(`--mode for run must resolve to cli or mcp (received ${rawMode}).`);
  }
  return normalized;
}

function reportFromPlaywright(plan, report, runCommand, runMode, axePath) {
  const axe = loadAxeIssues(axePath);
  const specs = collectPlaywrightSpecs(report);
  const planScenarioIds = new Set((plan.gremlin_scenarios ?? []).map((scenario) => scenario.id).filter(Boolean));
  let baselineFailed = false;
  const scenarioResults = [];
  for (const spec of specs) {
    for (const pwTest of spec.tests ?? []) {
      const annotations = pwTest.annotations ?? [];
      const isBaseline =
        annotationValue(annotations, "web-ux-gremlin-baseline") != null ||
        spec.title === baselineTestTitle;
      const status = playwrightOutcomeToStatus(pwTest.status);
      if (isBaseline) {
        if (status === "failed") baselineFailed = true;
        continue;
      }
      let scenarioId = annotationValue(annotations, "web-ux-gremlin-scenario");
      if (!scenarioId && typeof spec.title === "string" && spec.title.includes(":")) {
        scenarioId = spec.title.slice(0, spec.title.indexOf(":")).trim();
      }
      if (!scenarioId) continue;
      if (planScenarioIds.size > 0 && !planScenarioIds.has(scenarioId)) continue;
      const risk = annotationValue(annotations, "web-ux-gremlin-risk");
      const errors = (pwTest.results ?? [])
        .flatMap((result) => [result?.error?.message, ...(result?.errors ?? []).map((item) => item?.message)])
        .filter(Boolean)
        .map((message) => String(message).split("\n")[0].trim());
      scenarioResults.push({
        scenario_id: scenarioId,
        status,
        severity: severityForStatus(status, risk),
        outcome: `Playwright reported "${pwTest.status}".`,
        findings: [...new Set(errors)],
        suspected_bugs: [],
        accessibility_issues: axe.byScenario.get(scenarioId) ?? [],
        console_errors: [],
        screenshots: [],
        traces: [],
        recovery_notes: [],
        executed_commands: [runCommand],
        open_risks: []
      });
    }
  }

  const openRisks = [...axe.global];
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

  return {
    version: "1.0",
    run: {
      executed_at: new Date().toISOString(),
      executor: runMode === "mcp" ? "Playwright MCP runner" : "Playwright CLI",
      environment: plan.target?.environment || "",
      mode: runMode,
      build: process.env.WEB_UX_GREMLIN_BUILD || "",
      commit: process.env.WEB_UX_GREMLIN_COMMIT || report.config?.metadata?.commit || "",
      notes: baselineFailed
        ? "Baseline failed; mutation scenarios were blocked during execution."
        : "Generated from Playwright execution output."
    },
    executed_commands: [runCommand],
    open_risks: [...new Set(openRisks)],
    scenario_results: scenarioResults
  };
}

function commandRun(planPath, args = {}) {
  assertWorkflowPhase("generate", "run", args);
  const plan = readPlan(planPath);
  const errors = validatePlan(plan);
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  const mode = parseReportMode(args.mode || plan.mode);
  const runReportPath = path.resolve(args.runReport || defaultRunReportPath);
  const resolvedSpecPath = path.resolve(outputSpecPath);
  const resolvedMcpStatePath = path.resolve(args.mcpStatePath || defaultMcpStatePath);
  const commandSpec = executionCommandDescription(mode, {
    mcpCommand: args.mcpCommand,
    mcpStatePath: resolvedMcpStatePath,
    runReport: runReportPath
  });
  const commandLine = [commandSpec.command, ...commandSpec.args];
  if (!fs.existsSync(resolvedSpecPath)) {
    throw new Error(`generated spec missing at ${resolvedSpecPath}; run requires a spec from command generate.`);
  }
  if (args.dryRun) {
    console.log(`Would run (${commandSpec.mode}):`);
    console.log(commandLine.map((entry) => JSON.stringify(entry)).join(" "));
    return;
  }
  assertNoImplementationGaps(resolvedSpecPath);
  const runResult = spawnSync(commandSpec.command, commandSpec.args, {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: {
      ...process.env,
      WEB_UX_GREMLIN_TARGET_URL: plan.target?.url || process.env.WEB_UX_GREMLIN_TARGET_URL || ""
    }
  });
  fs.writeFileSync(path.resolve(".agent/session/web-ux-gremlin-run-stdout.txt"), runResult.stdout || "", "utf-8");
  fs.writeFileSync(path.resolve(".agent/session/web-ux-gremlin-run-stderr.txt"), runResult.stderr || "", "utf-8");
  if (runResult.status !== 0) {
    console.error(`ERROR: execute failed with status ${runResult.status}`);
    if (runResult.stderr) console.error(runResult.stderr.trim());
    process.exit(runResult.status || 1);
  }
  if (!fs.existsSync(runReportPath)) {
    throw new Error(`run did not produce a report at ${runReportPath}`);
  }
  const report = readJsonFile(runReportPath, "Playwright run report");
  const results = reportFromPlaywright(plan, report, commandLine.join(" "), mode, args.axe);
  const outputResultsPath = path.resolve(args.out || defaultIngestOut);
  fs.writeFileSync(outputResultsPath, `${JSON.stringify(results, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${outputResultsPath}`);
  console.log(`Executed in ${mode} mode`);
  setWorkflowPhase("execute");
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
    const assertions = (scenario.assertions ?? []).map((assertion) => `      ${JSON.stringify(quoteForComment(assertion))},`).join("\n");
    const annotation = `{ annotation: [{ type: 'web-ux-gremlin-scenario', description: ${JSON.stringify(scenario.id ?? "")} }, { type: 'web-ux-gremlin-risk', description: ${JSON.stringify(scenario.risk_level ?? "")} }] }`;
    return `
  test(${JSON.stringify(`${scenario.id}: ${testName(scenario.name)}`)}, ${annotation}, async ({ page }) => {
    test.skip(destructiveActionsAllowed === false && ${JSON.stringify(scenario.risk_level)} === "critical", "Critical/destructive UX paths require explicit safety review.");
    await page.goto(targetUrl);
${steps}
    // Expected behavior: ${quoteForComment(scenario.expected_behavior)}
    // Recovery check: ${quoteForComment(scenario.recovery_expectation)}
    // Accessibility notes: ${quoteForComment(scenario.accessibility_notes)}
    // Playwright notes: ${quoteForComment(scenario.playwright_notes)}
    // TODO: replace the guard below with concrete expect(...) assertions.
    requireImplementation(${JSON.stringify(scenario.id ?? "scenario")}, [
${assertions}
    ]);
  });`;
  }).join("\n");

  const source = `import { test, expect } from '@playwright/test';

const targetUrl = process.env.WEB_UX_GREMLIN_TARGET_URL || ${JSON.stringify(plan.target?.url || "http://localhost:3000")};
const destructiveActionsAllowed = ${plan.safety?.destructive_actions_allowed === true};

// Generated scenarios fail by default so an unfinished spec cannot silently pass
// in CI. Implement the assertions, then delete the matching requireImplementation
// call. Set WEB_UX_GREMLIN_ALLOW_TODO=true to soft-skip while iterating locally.
function requireImplementation(scenarioId, assertions) {
  const allowTodo = ['1', 'true', 'yes'].includes((process.env.WEB_UX_GREMLIN_ALLOW_TODO || '').trim().toLowerCase());
  if (allowTodo) {
    test.skip(true, \`UX Gremlin: \${scenarioId} not implemented yet\`);
    return;
  }
  const detail = assertions.length > 0 ? \` Expected assertions: \${assertions.join(' | ')}\` : '';
  throw new Error(\`UX Gremlin: implement assertions for "\${scenarioId}" before running in CI.\${detail}\`);
}

test.describe(${JSON.stringify(plan.name || "UX Gremlin Plan")}, () => {
  test('baseline happy path', { annotation: [{ type: 'web-ux-gremlin-baseline', description: 'true' }] }, async ({ page }) => {
    await page.goto(targetUrl);
${baselineSteps || "    // TODO: add baseline happy-path steps."}
    // Expected result: ${quoteForComment(plan.baseline_flow?.expected_result)}
    await expect(page).toHaveURL(/./);
    requireImplementation('baseline happy path', [${JSON.stringify(quoteForComment(plan.baseline_flow?.expected_result))}]);
  });
${scenarioTests}
});
`;
  fs.writeFileSync(outputSpecPath, source, "utf-8");
  console.log(`Wrote ${outputSpecPath}`);
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

function commandIngest(planPath, inputPath, axePath, outPath, requestedMode) {
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
  const mode = normalizeRequestedExecutionMode(requestedMode || plan.mode, "cli");
  const results = reportFromPlaywright(plan, report, `npx playwright test --reporter=json`, mode, axePath);

  const resolvedOut = path.resolve(outPath || defaultIngestOut);
  ensureDir(path.dirname(resolvedOut));
  fs.writeFileSync(resolvedOut, `${JSON.stringify(results, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${resolvedOut}`);
  console.log(`Scenarios ingested: ${results.scenario_results.length}${results.scenario_results.some((scenario) => scenario.status === "blocked") ? " (baseline failed; mutations blocked)" : ""}`);
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

function normalizeReport(plan, results, outDir, options = {}) {
  const planMode = normalizeExecutionMode(plan.mode, "cli");
  const overrideMode = options.mode ? normalizeExecutionMode(options.mode, planMode) : null;
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
      mode: planMode || "cli",
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
      mode: results?.run?.mode
        ? normalizeExecutionMode(results.run.mode, planMode)
        : overrideMode || planMode,
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
      traces: scenarios.flatMap((scenario) => scenario.traces)
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
${formatList([...scenario.screenshots, ...scenario.traces], "- None recorded.")}

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
      ? `<table><thead><tr><th>Severity</th><th>Status</th><th>Scenario</th><th>Category</th><th>Suspected Impact</th><th>Recommended Action</th></tr></thead><tbody>${topIssuesRows}</tbody></table>`
      : `<p>No open issues. Every executed scenario passed without suspected bugs or accessibility blockers.</p>`;

  const trendItems = report.trend
    ? [
      `Compared with run from ${report.trend.previous_generated_at || "unknown"}.`,
      `Pass rate now ${report.trend.pass_rate ?? "n/a"}% (delta ${report.trend.pass_rate_delta ?? "n/a"}).`,
      `Suspected bugs now ${report.trend.suspected_bug_count} (delta ${report.trend.suspected_bug_delta}).`,
      `Accessibility issues now ${report.trend.accessibility_issue_count} (delta ${report.trend.accessibility_issue_delta}).`
    ]
    : ["No previous run recorded; this is the first tracked run."];

  const scenarioSections = report.scenarios.map((scenario) => `<section>
    <h3>${escapeHtml(`${scenario.id}: ${scenario.name}`)} ${severityBadge(scenario.severity)} ${statusBadge(scenario.status)}</h3>
    <dl>
      <dt>Category</dt><dd>${escapeHtml(scenario.category)}</dd>
      <dt>Planned risk</dt><dd>${escapeHtml(scenario.risk_level)}</dd>
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
    body { color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; margin: 2rem auto; max-width: 1040px; padding: 0 1rem; }
    h1, h2, h3 { color: #111827; }
    section { border-top: 1px solid #d1d5db; padding: 1rem 0; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
    dt { font-weight: 700; }
    code, pre { background: #f3f4f6; border-radius: 4px; padding: 0.1rem 0.25rem; }
    table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
    th, td { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; font-size: 0.95rem; }
    th { background: #f9fafb; }
    .cards { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.75rem 1rem; min-width: 9rem; }
    .card .label { color: #6b7280; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .card .value { font-size: 1.4rem; font-weight: 700; }
    .verdict { display: inline-block; border-radius: 6px; padding: 0.35rem 0.75rem; font-weight: 700; color: #fff; }
    .verdict-pass { background: #15803d; }
    .verdict-pass-with-risks { background: #b45309; }
    .verdict-fail { background: #b91c1c; }
    .verdict-not-executed { background: #4b5563; }
    .badge { display: inline-block; border-radius: 999px; padding: 0.1rem 0.55rem; font-size: 0.78rem; font-weight: 700; color: #fff; }
    .sev-critical { background: #7f1d1d; } .sev-high { background: #b91c1c; } .sev-medium { background: #b45309; } .sev-low { background: #2563eb; } .sev-info, .sev-none { background: #6b7280; }
    .st-failed { background: #b91c1c; } .st-blocked { background: #7f1d1d; } .st-needs_review { background: #b45309; } .st-passed { background: #15803d; } .st-not_run { background: #6b7280; }
    .bar { display: flex; width: 100%; height: 1.5rem; border-radius: 6px; overflow: hidden; border: 1px solid #d1d5db; }
    .bar-seg { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.72rem; white-space: nowrap; min-width: 2.5rem; }
    .bar-seg span { padding: 0 0.25rem; }
    .st-passed, .sev-low { }
  </style>
</head>
<body>
  <h1>UX Gremlin Report</h1>
  <section>
    <h2>Executive Summary</h2>
    <p><span class="verdict verdict-${escapeHtml(verdictClass)}">${escapeHtml(exec.verdict)}</span></p>
    <div class="cards">
      <div class="card"><div class="label">Pass rate</div><div class="value">${escapeHtml(exec.pass_rate === null ? "n/a" : `${exec.pass_rate}%`)}</div></div>
      <div class="card"><div class="label">Risk score</div><div class="value">${escapeHtml(exec.risk_score)}/100</div><div>${severityBadge(exec.risk_band)}</div></div>
      <div class="card"><div class="label">Highest severity</div><div class="value">${severityBadge(exec.highest_open_severity)}</div></div>
      <div class="card"><div class="label">Suspected bugs</div><div class="value">${escapeHtml(exec.suspected_bug_count)}</div></div>
      <div class="card"><div class="label">A11y blockers</div><div class="value">${escapeHtml(exec.accessibility_blocker_count)}</div></div>
      <div class="card"><div class="label">Executed</div><div class="value">${escapeHtml(exec.executed_count)}/${escapeHtml(report.summary.scenario_count)}</div></div>
    </div>
    <dl>
      <dt>Target</dt><dd>${escapeHtml(report.plan.name || report.plan.target.url || report.plan.target.app_area || "(unnamed)")}</dd>
      <dt>Environment</dt><dd>${escapeHtml(report.run.environment || report.plan.target.environment || "(not set)")}</dd>
      <dt>Executed at</dt><dd>${escapeHtml(report.run.executed_at || "(not executed)")}${report.run.executor ? escapeHtml(` by ${report.run.executor}`) : ""}</dd>
      <dt>Build / commit</dt><dd>${escapeHtml(report.run.build || "(n/a)")}${report.run.commit ? escapeHtml(` / ${report.run.commit}`) : ""}</dd>
    </dl>
  </section>
  <section>
    <h2>Trend</h2>
    ${htmlList(trendItems, "No previous run recorded.")}
  </section>
  <section>
    <h2>Top Issues &amp; Recommended Actions</h2>
    ${topIssues}
  </section>
  <section>
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
    <h2>Baseline Flow</h2>
    ${htmlList(report.baseline_flow.steps.map((step, index) => `${index + 1}. ${step}`), "No baseline steps recorded.")}
    <p>Expected result: ${escapeHtml(report.baseline_flow.expected_result)}</p>
  </section>
  <section>
    <h2>Scenarios Tested</h2>
    ${scenarioSections || "<p>No scenario details recorded.</p>"}
  </section>
  <section>
    <h2>Findings</h2>
    ${htmlList(allFindings, "Pending execution.")}
  </section>
  <section>
    <h2>Bugs Suspected</h2>
    ${htmlList(allBugs, "Pending execution.")}
  </section>
  <section>
    <h2>Accessibility Issues</h2>
    ${htmlList(allAccessibility, "Pending keyboard, focus, ARIA, and screen-reader validation.")}
  </section>
  <section>
    <h2>Console Errors</h2>
    ${htmlList(allConsoleErrors, "Pending execution.")}
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

function renderJUnitReport(report) {
  const failureStatuses = new Set(["failed", "blocked"]);
  const skippedStatuses = new Set(["not_run", "needs_review"]);
  const failures = report.scenarios.filter((scenario) => failureStatuses.has(scenario.status)).length;
  const skipped = report.scenarios.filter((scenario) => skippedStatuses.has(scenario.status)).length;
  const cases = report.scenarios
    .map((scenario) => {
      const name = escapeHtml(`${scenario.id}: ${scenario.name}`);
      const classname = escapeHtml(scenario.category || "web-ux-gremlin");
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
<testsuites name="web-ux-gremlin" tests="${report.summary.scenario_count}" failures="${failures}" skipped="${skipped}">
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
  const report = normalizeReport(plan, results, outDir, options);
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
  setWorkflowPhase("report");

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
  else if (args.command === "check") commandCheck(planPath, args.workflow, args.mode);
  else if (args.command === "coverage") commandCoverage(planPath);
  else if (args.command === "summary") commandSummary(planPath);
  else if (args.command === "generate") commandGenerate(planPath, {
    workflow: args.workflow,
    mode: args.mode,
    updatePlan: args.updatePlan
  });
  else if (args.command === "generate-playwright") commandGeneratePlaywright(planPath, {
    workflow: args.workflow,
    mode: args.mode,
    updatePlan: args.updatePlan
  });
  else if (args.command === "run") commandRun(planPath, args);
  else if (args.command === "workflow-status") commandWorkflowStatus(args);
  else if (args.command === "ingest") commandIngest(planPath, args.input, args.axe, args.out, args.mode);
  else if (args.command === "report") {
    commandReport(planPath, args.results ? path.resolve(args.results) : null, args.outDir, {
      failOn: args.failOn,
      history: args.history,
      mode: args.mode
    });
  } else if (args.command === "gate") {
    commandGate(planPath, args.results ? path.resolve(args.results) : null, args.failOn);
  } else usage(2);
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
