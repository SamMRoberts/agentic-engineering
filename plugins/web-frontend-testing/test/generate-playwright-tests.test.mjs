import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
    generatePlaywrightTestsFromPlan,
    generatePlaywrightTestsFromPlanFile
} from "../skills/convert-web-frontend-plan-to-playwright-tests/scripts/generate-playwright-tests.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = (...parts) => path.join(__dirname, "fixtures", "plans", ...parts);

describe("generatePlaywrightTestsFromPlanFile", () => {
    it("compiles executable_steps from a CLI fixture plan", () => {
        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-frontend-tests-"));
        const result = generatePlaywrightTestsFromPlanFile(
            fixturePath("cli-executable-steps-plan.yaml"),
            { outDir }
        );

        assert.deepEqual(result.errors, []);
        assert.equal(result.generated.length, 1);

        const spec = fs.readFileSync(result.generated[0].filePath, "utf8");
        assert.match(spec, /test\("checkout-email-validation: Checkout email validation"/);
        assert.match(spec, /await page\.goto\("\/checkout"\);/);
        assert.match(spec, /page\.getByLabel\("Email"\)\.fill\("not-an-email"\)/);
        assert.match(spec, /page\.getByRole\("button", \{ name: "Continue" \}\)/);
        assert.match(spec, /toBeVisible\(\);/);
    });

    it("skips scenarios without convert_to_regression_test", () => {
        const plan = {
            plan_version: 1,
            target: { url: "https://example.com", stage: "local", auth_strategy: "none" },
            runner: "playwright-cli",
            cli_session: { test_command: "npm test" },
            safety: { destructive_actions_allowed: false, forbidden_selectors: [], forbidden_urls: [] },
            scope: { in_scope: ["home"], out_of_scope: ["admin"] },
            scenarios: [
                {
                    id: "home-smoke",
                    title: "Home renders",
                    priority: "P2",
                    surface: "route",
                    steps: [{ action: "navigate", target: "/", expect: "HTTP 200" }],
                    success_criteria: ["landmark visible"],
                    evidence_required: ["snapshot"]
                    // no convert_to_regression_test, no executable_steps
                }
            ]
        };

        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-frontend-tests-"));
        const result = generatePlaywrightTestsFromPlan(plan, { outDir });

        assert.deepEqual(result.errors, []);
        assert.equal(result.generated.length, 0);
        assert.equal(result.skipped.length, 1);
        assert.equal(result.skipped[0].scenarioId, "home-smoke");
    });

    it("refuses to generate when the plan fails validation", () => {
        const plan = {
            plan_version: 1,
            target: { url: "https://example.com", stage: "local", auth_strategy: "none" },
            runner: "playwright-cli",
            // no cli_session and no scenario CLI target -> lint error
            safety: { destructive_actions_allowed: false, forbidden_selectors: [], forbidden_urls: [] },
            scope: { in_scope: ["home"], out_of_scope: ["admin"] },
            scenarios: [
                {
                    id: "home-smoke",
                    title: "Home renders",
                    priority: "P2",
                    surface: "route",
                    steps: [{ action: "navigate", target: "/", expect: "HTTP 200" }],
                    success_criteria: ["landmark visible"],
                    evidence_required: ["snapshot"]
                }
            ]
        };

        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-frontend-tests-"));
        const result = generatePlaywrightTestsFromPlan(plan, { outDir });

        assert.equal(result.generated.length, 0);
        assert.ok(
            result.errors.some((e) => e.includes("no deterministic CLI target")),
            `expected CLI target error, got: ${JSON.stringify(result.errors)}`
        );
    });
});
