// Re-export the shared plan validator with runner types.
import type { ValidationResult } from "./types.js";
import { validatePlan as validate } from "../../lib/plan-validator.mjs";

export function validatePlan(plan: unknown): ValidationResult {
  return validate(plan);
}
