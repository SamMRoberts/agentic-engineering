import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");

function runHook(relScript, payload) {
    const result = spawnSync(
        process.execPath,
        [path.join(pluginRoot, relScript)],
        {
            input: JSON.stringify(payload),
            cwd: pluginRoot,
            encoding: "utf8"
        }
    );
    return {
        code: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        json: result.stdout ? JSON.parse(result.stdout) : null
    };
}

test("block-credentials allows benign file writes", () => {
    const r = runHook("hooks/block-credentials.mjs", {
        tool_name: "edit",
        tool_input: {
            filePath: "/tmp/example.yaml",
            newString: "scope:\n  in_scope:\n    - home\n"
        }
    });
    assert.equal(r.code, 0);
    assert.equal(r.json.hookSpecificOutput.permissionDecision, "allow");
});

test("block-credentials denies writes containing JWT literals", () => {
    const r = runHook("hooks/block-credentials.mjs", {
        tool_name: "edit",
        tool_input: {
            filePath: "/tmp/example.yaml",
            newString: "auth: eyJhbGciOiJIUzI1NiJ9.payloadpartabc12345.signaturepartxyz9876\n"
        }
    });
    assert.equal(r.json.hookSpecificOutput.permissionDecision, "deny");
    assert.match(r.json.hookSpecificOutput.permissionDecisionReason, /JWT/);
});

test("block-credentials ignores non-write tools", () => {
    const r = runHook("hooks/block-credentials.mjs", {
        tool_name: "playwright/browser_click",
        tool_input: { selector: "button#login" }
    });
    assert.equal(r.json.hookSpecificOutput.permissionDecision, "allow");
});

test("block-credentials handles env var references as safe", () => {
    const r = runHook("hooks/block-credentials.mjs", {
        tool_name: "edit",
        tool_input: {
            filePath: "/tmp/example.yaml",
            newString: "value: ${SESSION_TOKEN}\n"
        }
    });
    assert.equal(r.json.hookSpecificOutput.permissionDecision, "allow");
});

test("confirm-browser-evaluate asks for confirmation", () => {
    const r = runHook("hooks/confirm-browser-evaluate.mjs", {
        tool_name: "playwright/browser_evaluate",
        tool_input: { function: "() => document.title" }
    });
    assert.equal(r.json.hookSpecificOutput.permissionDecision, "ask");
    assert.match(r.json.hookSpecificOutput.permissionDecisionReason, /arbitrary JavaScript/);
});

test("confirm-browser-evaluate ignores other playwright tools", () => {
    const r = runHook("hooks/confirm-browser-evaluate.mjs", {
        tool_name: "playwright/browser_click",
        tool_input: { selector: "a" }
    });
    assert.equal(r.json.hookSpecificOutput.permissionDecision, "allow");
});

test("validate-test-plan no-ops when no test-plan.yaml path is in the payload", () => {
    const r = runHook("hooks/validate-test-plan.mjs", {
        tool_name: "edit",
        tool_input: { filePath: "/tmp/unrelated.md", newString: "hello" }
    });
    assert.equal(r.code, 0);
    assert.equal(r.stdout, "");
});

test("validate-test-plan blocks when plan has validation errors", () => {
    const tmp = path.join(os.tmpdir(), `wft-hook-test-${Date.now()}-bad`);
    fs.mkdirSync(tmp, { recursive: true });
    const planPath = path.join(tmp, "test-plan.yaml");
    fs.writeFileSync(planPath, "plan_version: 2\n", "utf8"); // wrong const
    try {
        const r = runHook("hooks/validate-test-plan.mjs", {
            tool_name: "edit",
            tool_input: { filePath: planPath, newString: "..." }
        });
        assert.equal(r.json.decision, "block");
        assert.match(r.json.systemMessage, /ERROR/);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test("validate-test-plan reports OK for a well-formed plan", () => {
    const tmp = path.join(os.tmpdir(), `wft-hook-test-${Date.now()}-ok`);
    fs.mkdirSync(tmp, { recursive: true });
    const planPath = path.join(tmp, "test-plan.yaml");
    const goodPlan = `plan_version: 1
target:
  url: https://example.com
  stage: local
  auth_strategy: none
runner: playwright-mcp
safety:
  destructive_actions_allowed: false
  forbidden_selectors: []
  forbidden_urls: []
scope:
  in_scope: [home]
  out_of_scope: [admin]
scenarios:
  - id: home-smoke
    title: Home renders
    priority: P2
    surface: route
    steps:
      - action: navigate
        target: /
        expect: HTTP 200 and DOM ready
    success_criteria: [primary landmark visible]
    evidence_required: [snapshot]
`;
    fs.writeFileSync(planPath, goodPlan, "utf8");
    try {
        const r = runHook("hooks/validate-test-plan.mjs", {
            tool_name: "edit",
            tool_input: { filePath: planPath, newString: goodPlan }
        });
        assert.equal(r.json.decision, undefined);
        assert.match(r.json.systemMessage, /OK/);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});
