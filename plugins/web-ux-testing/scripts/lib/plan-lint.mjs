import { walk } from "./yaml-utils.mjs";

const forbiddenCredentialKeys = [
  "password",
  "secret",
  "token",
  "api_key",
  "apikey",
  "credential",
  "credentials",
  "session_cookie",
  "cookie"
];

const vaguePhrases = [
  "verify it works",
  "looks good",
  "check page",
  "test functionality",
  "make sure it works"
];

const pixelCoordinatePattern = /\b(x|y)\s*=\s*\d+|\bclick\s+at\s+\d+|\bcoordinates?\b/i;

export function collectScenarios(plan) {
  const scenarios = [];

  for (const area of plan.test_areas ?? []) {
    for (const scenario of area.scenarios ?? []) {
      scenarios.push({ area: area.name, scenario });
    }
  }

  return scenarios;
}

export function lintPlan(plan) {
  const errors = [];
  const warnings = [];
  const scenarioIds = new Set();

  if (!plan.scope?.exclude || plan.scope.exclude.length === 0) {
    warnings.push("Missing scope.exclude. Add explicit out-of-scope or unsafe actions.");
  }

  if (plan.auth?.required && !plan.auth?.strategy) {
    errors.push("Auth is required but no auth.strategy is defined.");
  }

  walk(plan, (value, currentPath) => {
    const key = String(currentPath.at(-1) ?? "").toLowerCase();

    if (forbiddenCredentialKeys.includes(key)) {
      errors.push(`Forbidden credential-like key found at ${currentPath.join(".")}`);
    }

    if (typeof value === "string") {
      const normalized = value.toLowerCase();

      if (vaguePhrases.some((phrase) => normalized.includes(phrase))) {
        warnings.push(`Vague test instruction found at ${currentPath.join(".")}: "${value}"`);
      }

      if (pixelCoordinatePattern.test(value)) {
        warnings.push(`Pixel-coordinate-style instruction found at ${currentPath.join(".")}: "${value}"`);
      }
    }
  });

  for (const { area, scenario } of collectScenarios(plan)) {
    if (!scenario.id) {
      errors.push(`Scenario in area "${area}" is missing id.`);
      continue;
    }

    if (scenarioIds.has(scenario.id)) {
      errors.push(`Duplicate scenario id: ${scenario.id}`);
    }

    scenarioIds.add(scenario.id);
  }

  const serialized = JSON.stringify(plan).toLowerCase();

  if (!serialized.includes("accessibility") && !serialized.includes("keyboard")) {
    warnings.push("Plan appears to be missing accessibility or keyboard coverage.");
  }

  if (!serialized.includes("console_errors")) {
    warnings.push("Plan appears to be missing console error evidence capture.");
  }

  if (!serialized.includes("network_failures")) {
    warnings.push("Plan appears to be missing network failure evidence capture.");
  }

  if (serialized.includes("delete") || serialized.includes("remove") || serialized.includes("destroy")) {
    if (!plan.rules?.avoid_destructive_actions) {
      warnings.push("Plan includes destructive action wording but avoid_destructive_actions is not enabled.");
    }
  }

  return { errors, warnings };
}