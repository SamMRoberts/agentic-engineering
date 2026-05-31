// Re-export the shared Playwright spec generator.
import type { TestPlan } from "./types.js";
import { generateSpec as generate } from "../../lib/test-generator.mjs";

export function generateSpec(plan: TestPlan): string {
  return generate(plan);
}
