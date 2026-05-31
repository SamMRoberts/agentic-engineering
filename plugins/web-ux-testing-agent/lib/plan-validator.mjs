// Validate a web UX test plan: JSON Schema validation plus semantic lint rules
// that enforce safety and determinism conventions.
import { getValidator, formatAjvErrors } from "./schema-utils.mjs";
import { isEmptySelector, isAccessible } from "./selectors.mjs";

const DOM_ACTIONS = new Set([
  "click",
  "dblclick",
  "fill",
  "select",
  "check",
  "uncheck",
  "press",
  "hover",
  "upload",
  "assert_visible",
  "assert_hidden",
  "assert_text",
  "assert_value",
  "assert_count"
]);

const VALUE_REQUIRED = new Set([
  "fill",
  "select",
  "press",
  "upload",
  "assert_text",
  "assert_value",
  "assert_count"
]);

// Patterns that look like inline credentials/secrets and must never appear in a plan.
const SECRET_KEYS = /(password|passwd|secret|token|api[_-]?key|cookie|authorization|bearer|private[_-]?key)/i;

/**
 * Validate a parsed plan object.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validatePlan(plan) {
  const errors = [];
  const warnings = [];

  if (plan == null || typeof plan !== "object") {
    return { errors: ["Plan is not an object"], warnings };
  }

  // 1. Structural validation against the JSON Schema.
  const validate = getValidator("test-plan.schema.json");
  if (!validate(plan)) {
    errors.push(...formatAjvErrors(validate.errors));
  }

  // 2. Semantic lint (only meaningful once basic shape is present).
  const allSteps = [
    ...(Array.isArray(plan.steps) ? plan.steps.map((s) => ["steps", s]) : []),
    ...(Array.isArray(plan.assertions) ? plan.assertions.map((s) => ["assertions", s]) : []),
    ...(Array.isArray(plan.cleanup) ? plan.cleanup.map((s) => ["cleanup", s]) : [])
  ];

  const seenIds = new Set();
  for (const [section, step] of allSteps) {
    if (!step || typeof step !== "object") continue;
    const where = `${section}[${step.id ?? "?"}]`;

    if (step.id) {
      if (seenIds.has(step.id)) errors.push(`${where}: duplicate step id "${step.id}"`);
      seenIds.add(step.id);
    }

    // navigate needs a url; assert_url needs url or value.
    if (step.action === "navigate" && !step.url) {
      errors.push(`${where}: navigate requires "url"`);
    }
    if (step.action === "assert_url" && !step.url && step.value == null) {
      errors.push(`${where}: assert_url requires "url" or "value"`);
    }

    // DOM actions need a non-empty target unless flagged for discovery.
    if (DOM_ACTIONS.has(step.action)) {
      if (isEmptySelector(step.target)) {
        if (step.needs_discovery) {
          warnings.push(`${where}: "${step.action}" has no target yet (needs_discovery)`);
        } else {
          errors.push(`${where}: "${step.action}" requires a "target" selector (or set needs_discovery: true)`);
        }
      } else if (!isAccessible(step.target) && !step.needs_discovery) {
        warnings.push(`${where}: target uses a brittle css/xpath selector; prefer role/label/text/test_id`);
      }
    }

    // Actions whose payload lives in "value".
    if (VALUE_REQUIRED.has(step.action) && step.value == null) {
      errors.push(`${where}: "${step.action}" requires a "value"`);
    }

    // Secret hygiene: never embed credentials in a plan.
    if (typeof step.value === "string" && looksLikeSecretValue(step.id, step.value)) {
      errors.push(`${where}: value appears to contain a credential/secret; reference an env var or storage state instead`);
    }
  }

  // 3. Auth coherence.
  const auth = plan.environment?.auth;
  if (auth?.required && (!auth.strategy || auth.strategy === "none")) {
    warnings.push("environment.auth.required is true but no auth strategy is set");
  }
  if (auth?.strategy === "storage_state" && !auth.storage_state_path) {
    warnings.push("auth.strategy is storage_state but storage_state_path is not set");
  }

  // 4. Destructive-on-production guard.
  if (plan.environment?.stage === "production" && plan.environment?.destructive_actions_allowed) {
    warnings.push("destructive_actions_allowed is true on a production environment; confirm this is intended");
  }

  // 5. Scan the whole plan for secret-like keys.
  scanForSecrets(plan, "plan", errors);

  return { errors, warnings };
}

function looksLikeSecretValue(id, value) {
  // ${ENV} indirection is always safe — no literal secret is stored.
  if (/^\$\{[^}]+\}$/.test(String(value).trim())) return false;
  if (SECRET_KEYS.test(String(id ?? ""))) return true;
  return false;
}

function scanForSecrets(node, path, errors) {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => scanForSecrets(v, `${path}[${i}]`, errors));
    return;
  }
  if (typeof node === "object") {
    for (const [key, val] of Object.entries(node)) {
      // Allow *_env / *_path indirection keys.
      if (SECRET_KEYS.test(key) && !/_env$|_path$/i.test(key) && typeof val === "string") {
        if (!/^\$\{[^}]+\}$/.test(val.trim())) {
          errors.push(`${path}.${key}: secret-like key holds a literal value; use an env var reference instead`);
        }
      }
      scanForSecrets(val, `${path}.${key}`, errors);
    }
  }
}
