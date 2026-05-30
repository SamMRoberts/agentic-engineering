import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { validatePlanFile } from "../lib/plan-validation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = (...parts) => path.join(__dirname, "fixtures", "plans", ...parts);

describe("validatePlanFile", () => {
  it("accepts a schema-valid plan with required workflow fields", () => {
    const result = validatePlanFile(fixturePath("valid-plan.yaml"));

    assert.deepEqual(result.errors, []);
  });

  it("rejects scenarios missing strict stop conditions", () => {
    const result = validatePlanFile(fixturePath("missing-stop-conditions.yaml"));

    assert.match(result.errors.join("\n"), /stop_conditions/);
  });

  it("rejects credential-like keys anywhere in the plan", () => {
    const result = validatePlanFile(fixturePath("credential-key.yaml"));

    assert.match(result.errors.join("\n"), /Forbidden credential-like key/);
  });

  it("rejects duplicate scenario ids across areas", () => {
    const result = validatePlanFile(fixturePath("duplicate-scenario-id.yaml"));

    assert.match(result.errors.join("\n"), /Duplicate scenario id: DUP-001/);
  });
});