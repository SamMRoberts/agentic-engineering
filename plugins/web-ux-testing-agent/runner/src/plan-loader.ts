// Re-export the shared plan loader with runner types.
import type { TestPlan } from "./types.js";
import { loadPlan as load, parsePlan as parse, stringifyPlan as stringify } from "../../lib/plan-loader.mjs";

export function loadPlan(filePath: string): TestPlan {
  return load(filePath);
}
export function parsePlan(raw: string, opts?: { format?: "json" | "yaml" }): TestPlan {
  return parse(raw, opts);
}
export function stringifyPlan(plan: TestPlan): string {
  return stringify(plan);
}
