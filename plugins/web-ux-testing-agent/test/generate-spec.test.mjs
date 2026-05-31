import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlan } from "../lib/plan-loader.mjs";
import { generateSpec } from "../lib/test-generator.mjs";
import { buildLocator } from "../lib/selectors.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, "fixtures", name);

test("buildLocator prefers accessible strategies and scopes within", () => {
  assert.equal(
    buildLocator({ role: "button", name: "Add New" }),
    'page.getByRole("button", { name: "Add New" })'
  );
  assert.equal(buildLocator({ label: "Title" }), 'page.getByLabel("Title")');
  assert.equal(buildLocator({ test_id: "save" }), 'page.getByTestId("save")');
  assert.equal(
    buildLocator({ role: "menuitem", name: "Page", within: { role: "dialog", name: "Add New" } }),
    'page.getByRole("dialog", { name: "Add New" }).getByRole("menuitem", { name: "Page" })'
  );
});

test("generateSpec emits test.step() per step and an afterEach for cleanup", () => {
  const plan = loadPlan(fixture("valid-plan.yaml"));
  const spec = generateSpec(plan);
  assert.match(spec, /import \{ test, expect \} from "@playwright\/test"/);
  assert.match(spec, /test\("Create a new page from the content menu"/);
  // One test.step per declared step + assertions.
  const stepCount = (spec.match(/await test\.step\(/g) || []).length;
  assert.ok(stepCount >= plan.steps.length, `expected >= ${plan.steps.length} steps, got ${stepCount}`);
  assert.match(spec, /test\.afterEach/);
  // Accessible locators, no raw css for known steps.
  assert.match(spec, /getByRole\("tab", \{ name: "Pages" \}\)/);
  assert.match(spec, /toContainText\("Page created"\)/);
});

test("generateSpec marks needs_discovery steps with a TODO", () => {
  const plan = {
    id: "p",
    title: "p",
    environment: { base_url: "http://x" },
    steps: [
      { id: "nav", action: "navigate", url: "http://x" },
      { id: "mystery", action: "click", needs_discovery: true, target: {} }
    ]
  };
  const spec = generateSpec(plan);
  assert.match(spec, /TODO\(discovery\): resolve selector for step "mystery"/);
});

test("generateSpec reads ${ENV} values from process.env, never literal secrets", () => {
  const plan = {
    id: "p",
    title: "p",
    environment: { base_url: "${BASE_URL}" },
    steps: [
      { id: "nav", action: "navigate", url: "${BASE_URL}/login" },
      { id: "pw", action: "fill", target: { label: "Password" }, value: "${APP_PASSWORD}" }
    ]
  };
  const spec = generateSpec(plan);
  assert.match(spec, /process\.env\.APP_PASSWORD/);
  assert.doesNotMatch(spec, /"\$\{APP_PASSWORD\}"/);
  assert.match(spec, /process\.env\.BASE_URL/);
});
