// Normalize a plan: apply defaults, fill missing step ids, and produce a stable
// canonical shape. Non-destructive: never invents selectors or values.
import { stringifyPlan } from "./plan-loader.mjs";

export function normalizePlan(plan) {
  const out = { ...plan };
  out.schema_version = out.schema_version ?? "1.0";
  out.tags = Array.isArray(out.tags) ? out.tags : out.tags ? [out.tags] : [];

  out.environment = { ...(out.environment ?? {}) };
  if (out.environment.test_id_attribute == null) out.environment.test_id_attribute = "data-testid";
  if (!Array.isArray(out.environment.browsers) || out.environment.browsers.length === 0) {
    out.environment.browsers = ["chromium"];
  }

  const idCounts = new Map();
  const normSteps = (steps, prefix) =>
    (Array.isArray(steps) ? steps : []).map((step, i) => {
      const s = { ...step };
      if (!s.id) s.id = `${prefix}-${i + 1}`;
      // De-duplicate ids deterministically.
      const seen = idCounts.get(s.id) ?? 0;
      idCounts.set(s.id, seen + 1);
      if (seen > 0) s.id = `${s.id}-${seen + 1}`;
      return s;
    });

  if (out.steps) out.steps = normSteps(out.steps, "step");
  if (out.assertions) out.assertions = normSteps(out.assertions, "assert");
  if (out.cleanup) out.cleanup = normSteps(out.cleanup, "cleanup");

  return out;
}

export function normalizePlanToYaml(plan) {
  return stringifyPlan(normalizePlan(plan));
}
