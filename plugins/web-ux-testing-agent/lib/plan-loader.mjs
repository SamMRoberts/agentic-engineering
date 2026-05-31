// Load a web UX test plan from YAML or JSON on disk (or from a raw string).
import fs from "node:fs";
import YAML from "yaml";

/** Parse a plan from a raw YAML/JSON string. Throws on parse error. */
export function parsePlan(raw, { format } = {}) {
  if (format === "json") return JSON.parse(raw);
  // YAML.parse also accepts JSON, so it is a safe default.
  return YAML.parse(raw);
}

/** Load and parse a plan file from disk. */
export function loadPlan(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const format = filePath.endsWith(".json") ? "json" : "yaml";
  const plan = parsePlan(raw, { format });
  if (plan == null || typeof plan !== "object") {
    throw new Error(`Plan at ${filePath} did not parse to an object`);
  }
  return plan;
}

/** Serialize a plan back to YAML for writing. */
export function stringifyPlan(plan) {
  return YAML.stringify(plan);
}
