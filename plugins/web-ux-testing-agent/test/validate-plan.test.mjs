import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlan } from "../lib/plan-loader.mjs";
import { validatePlan } from "../lib/plan-validator.mjs";
import { normalizePlan } from "../lib/plan-normalizer.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, "fixtures", name);

test("valid plan passes validation with no errors", () => {
  const plan = loadPlan(fixture("valid-plan.yaml"));
  const { errors } = validatePlan(plan);
  assert.deepEqual(errors, [], `unexpected errors: ${errors.join("; ")}`);
});

test("invalid plan reports the expected error classes", () => {
  const plan = loadPlan(fixture("invalid-plan.yaml"));
  const { errors } = validatePlan(plan);
  const joined = errors.join("\n");
  assert.match(joined, /navigate requires "url"/);
  assert.match(joined, /requires a "target" selector/);
  assert.match(joined, /requires a "value"/);
  assert.match(joined, /duplicate step id/);
});

test("plan with an inline credential is rejected", () => {
  const plan = {
    id: "p",
    title: "p",
    environment: { base_url: "http://x", auth: { password: "hunter2" } },
    steps: [{ id: "n", action: "navigate", url: "http://x" }]
  };
  const { errors } = validatePlan(plan);
  assert.ok(
    errors.some((e) => /secret-like key/.test(e)),
    `expected a secret error, got: ${errors.join("; ")}`
  );
});

test("env-var indirection for secret-like keys is allowed", () => {
  const plan = {
    id: "p",
    title: "p",
    environment: { base_url: "${BASE_URL}", auth: { password_env: "APP_PASSWORD" } },
    steps: [{ id: "n", action: "navigate", url: "${BASE_URL}" }]
  };
  const { errors } = validatePlan(plan);
  assert.deepEqual(errors, []);
});

test("normalizePlan fills defaults and de-duplicates step ids", () => {
  const plan = {
    id: "p",
    title: "p",
    environment: { base_url: "http://x" },
    steps: [
      { action: "navigate", url: "http://x" },
      { id: "dup", action: "click", target: { role: "button", name: "A" } },
      { id: "dup", action: "click", target: { role: "button", name: "B" } }
    ]
  };
  const out = normalizePlan(plan);
  assert.equal(out.environment.test_id_attribute, "data-testid");
  assert.deepEqual(out.environment.browsers, ["chromium"]);
  assert.equal(out.steps[0].id, "step-1");
  assert.equal(out.steps[1].id, "dup");
  assert.equal(out.steps[2].id, "dup-2");
});
