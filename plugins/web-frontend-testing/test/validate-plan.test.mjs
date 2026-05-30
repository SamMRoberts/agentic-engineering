import test from "node:test";
import assert from "node:assert/strict";

import { validatePlan } from "../lib/plan-validation.mjs";

function basePlan(overrides = {}) {
    return {
        plan_version: 1,
        target: {
            url: "https://example.com",
            stage: "local",
            auth_strategy: "none"
        },
        runner: "playwright-mcp",
        safety: {
            destructive_actions_allowed: false,
            forbidden_selectors: [],
            forbidden_urls: []
        },
        scope: {
            in_scope: ["home"],
            out_of_scope: ["admin"]
        },
        scenarios: [
            {
                id: "home-smoke",
                title: "Home renders",
                priority: "P2",
                surface: "route",
                preconditions: ["app reachable"],
                steps: [
                    { action: "navigate", target: "/", expect: "HTTP 200 and DOM ready" }
                ],
                success_criteria: ["primary landmark visible"],
                evidence_required: ["snapshot", "console"]
            }
        ],
        ...overrides
    };
}

test("validatePlan accepts a minimal well-formed plan", () => {
    const result = validatePlan(basePlan());
    assert.deepEqual(result.errors, []);
});

test("validatePlan flags missing required top-level field", () => {
    const plan = basePlan();
    delete plan.runner;
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes('required property "runner"')),
        `expected missing runner error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan rejects invalid scenario id casing", () => {
    const plan = basePlan();
    plan.scenarios[0].id = "Home_Smoke";
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("/scenarios/0/id")),
        `expected id pattern error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan rejects duplicate scenario ids", () => {
    const plan = basePlan();
    plan.scenarios.push({ ...plan.scenarios[0] });
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes('duplicate scenario id "home-smoke"')),
        `expected duplicate id error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan requires at least one step with a non-empty expect", () => {
    const plan = basePlan();
    plan.scenarios[0].steps = [{ action: "navigate", target: "/", expect: "" }];
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("non-empty expect")
            || e.includes("must NOT have fewer than 1 character")),
        `expected expect-empty error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan rejects production targets that allow destructive actions", () => {
    const plan = basePlan({
        target: { url: "https://example.com", stage: "production", auth_strategy: "none" },
        safety: { destructive_actions_allowed: true, forbidden_selectors: [], forbidden_urls: [] }
    });
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("destructive_actions_allowed must be false")),
        `expected production safety error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan flags JWT-shaped credential literals", () => {
    const plan = basePlan();
    plan.scenarios[0].steps[0].value = "eyJhbGciOiJIUzI1NiJ9.payloadpartabc12345.signaturepartxyz9876";
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("JWT")),
        `expected JWT credential error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan allows env var references for secrets", () => {
    const plan = basePlan();
    plan.scenarios[0].steps[0].value = "${SESSION_TOKEN}";
    const result = validatePlan(plan);
    assert.deepEqual(result.errors, []);
});

test("validatePlan errors when playwright-cli plan has no CLI target", () => {
    const plan = basePlan({ runner: "playwright-cli" });
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("no deterministic CLI target")),
        `expected missing CLI target error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan accepts playwright-cli plan with cli_session.test_command", () => {
    const plan = basePlan({
        runner: "playwright-cli",
        cli_session: { test_command: "npm run test:e2e -- --grep home" }
    });
    const result = validatePlan(plan);
    assert.deepEqual(result.errors, []);
});

test("validatePlan accepts playwright-cli plan with scenario executable_steps", () => {
    const plan = basePlan({ runner: "playwright-cli" });
    plan.scenarios[0].convert_to_regression_test = true;
    plan.scenarios[0].executable_steps = [
        { action: "navigate", path: "/" },
        { action: "assert_visible", locator: { strategy: "role", role: "main" } }
    ];
    const result = validatePlan(plan);
    assert.deepEqual(result.errors, []);
});

test("validatePlan errors when executable_steps action lacks required fields", () => {
    const plan = basePlan({
        runner: "playwright-cli",
        cli_session: { test_command: "npm test" }
    });
    plan.scenarios[0].convert_to_regression_test = true;
    plan.scenarios[0].executable_steps = [
        { action: "fill", locator: { strategy: "label", value: "Email" } } // missing value
    ];
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => /executable_steps\/0/.test(e) || /must include required property/.test(e)),
        `expected executable_steps validation error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan errors when hybrid runner lacks CLI target", () => {
    const plan = basePlan({ runner: "hybrid" });
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("hybrid") && e.includes("CLI")),
        `expected hybrid CLI target error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan errors when pre_test_auth_session enabled with per_test_seed auth", () => {
    const plan = basePlan({
        runner: "playwright-cli",
        cli_session: {
            test_command: "npm test",
            pre_test_auth_session: { enabled: true, mode: "headed_browser", ready_signal: "user_confirmation" }
        },
        target: { url: "https://example.com", stage: "local", auth_strategy: "per_test_seed" }
    });
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("pre_test_auth_session.enabled") && e.includes("per_test_seed")),
        `expected pre_test_auth_session/per_test_seed error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan errors when pre_test_auth_session ready_signal storage_state_written has no path", () => {
    const plan = basePlan({
        runner: "playwright-cli",
        cli_session: { test_command: "npm test" },
        target: { url: "https://example.com", stage: "local", auth_strategy: "storage_state" }
    });
    plan.scenarios[0].pre_test_auth_session = {
        enabled: true,
        mode: "headed_browser",
        ready_signal: "storage_state_written"
    };
    const result = validatePlan(plan);
    assert.ok(
        result.errors.some((e) => e.includes("storage_state_written") && e.includes("storage_state_path")),
        `expected storage_state_path error, got: ${JSON.stringify(result.errors)}`
    );
});

test("validatePlan accepts pre_test_auth_session with storage_state_path", () => {
    const plan = basePlan({
        runner: "playwright-cli",
        cli_session: {
            test_command: "npm test",
            pre_test_auth_session: {
                enabled: true,
                mode: "headed_browser",
                ready_signal: "storage_state_written",
                storage_state_path: ".playwright/auth/dashboard.json"
            }
        },
        target: { url: "https://example.com", stage: "local", auth_strategy: "storage_state" }
    });
    const result = validatePlan(plan);
    assert.deepEqual(result.errors, []);
});

test("validatePlan warns when CLI metadata is present but runner is playwright-mcp", () => {
    const plan = basePlan();
    plan.cli_session = { test_command: "npm test" };
    const result = validatePlan(plan);
    assert.deepEqual(result.errors, []);
    assert.ok(
        result.warnings.some((w) => w.includes("cli_session") && w.includes("playwright-mcp")),
        `expected CLI-on-MCP warning, got: ${JSON.stringify(result.warnings)}`
    );
});

test("validatePlan warns when scenario count exceeds first-pass cap", () => {
    const plan = basePlan();
    const extra = Array.from({ length: 11 }, (_, i) => ({
        ...plan.scenarios[0],
        id: `extra-${i}`
    }));
    plan.scenarios = [plan.scenarios[0], ...extra];
    const result = validatePlan(plan);
    assert.ok(
        result.warnings.some((w) => w.includes("exceeds first-pass cap")),
        `expected scenario cap warning, got: ${JSON.stringify(result.warnings)}`
    );
});
