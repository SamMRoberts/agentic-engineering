import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../..");
const fixtureDir = path.resolve(pluginRoot, "test/fixtures");

function runHook(hookFile, payload) {
    return new Promise((resolve, reject) => {
        const child = spawn("node", [path.join(pluginRoot, "hooks", hookFile)], {
            stdio: ["pipe", "pipe", "pipe"]
        });
        const stdoutChunks = [];
        const stderrChunks = [];
        child.stdout.on("data", (c) => stdoutChunks.push(c));
        child.stderr.on("data", (c) => stderrChunks.push(c));
        child.on("error", reject);
        child.on("close", (code) => {
            const stdout = Buffer.concat(stdoutChunks).toString("utf8");
            const stderr = Buffer.concat(stderrChunks).toString("utf8");
            let parsed = null;
            try { parsed = JSON.parse(stdout); } catch { /* leave null */ }
            resolve({ exitCode: code, stdout, stderr, parsed });
        });
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
    });
}

test("deny-auth-credentials allows writes outside auth/", async () => {
    const result = await runHook("deny-auth-credentials.mjs", {
        tool_name: "edit",
        tool_input: { file_path: "src/main.js", content: "console.log('hi')" }
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.parsed?.hookSpecificOutput?.permissionDecision, "allow");
});

test("deny-auth-credentials denies password literal under auth/", async () => {
    const result = await runHook("deny-auth-credentials.mjs", {
        tool_name: "create",
        tool_input: {
            file_path: ".web-ux-testing/auth/user.json",
            content: '{"password": "hunter2hunter2"}'
        }
    });
    assert.equal(result.parsed?.hookSpecificOutput?.permissionDecision, "deny");
    assert.match(result.parsed?.hookSpecificOutput?.permissionDecisionReason ?? "", /Password literal/);
});

test("deny-auth-credentials allows env-var reference under auth/", async () => {
    const result = await runHook("deny-auth-credentials.mjs", {
        tool_name: "create",
        tool_input: {
            file_path: ".web-ux-testing/auth/user.json",
            content: 'token: ${SESSION_TOKEN}'
        }
    });
    assert.equal(result.parsed?.hookSpecificOutput?.permissionDecision, "allow");
});

test("validate-plan blocks invalid plan write", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "wux-hook-"));
    const planDir = path.join(cwd, ".web-ux-testing", "plans");
    fs.mkdirSync(planDir, { recursive: true });
    const planPath = path.join(planDir, "bad.yaml");
    fs.copyFileSync(path.join(fixtureDir, "plan-invalid-missing-baseurl.yaml"), planPath);

    const result = await new Promise((resolve, reject) => {
        const child = spawn("node", [path.join(pluginRoot, "hooks", "validate-plan.mjs")], {
            stdio: ["pipe", "pipe", "pipe"],
            cwd
        });
        const out = []; const err = [];
        child.stdout.on("data", (c) => out.push(c));
        child.stderr.on("data", (c) => err.push(c));
        child.on("error", reject);
        child.on("close", (code) => {
            const stdout = Buffer.concat(out).toString("utf8");
            const stderr = Buffer.concat(err).toString("utf8");
            let parsed = null;
            try { parsed = JSON.parse(stdout); } catch { /* */ }
            resolve({ exitCode: code, stdout, stderr, parsed });
        });
        child.stdin.write(JSON.stringify({
            tool_name: "create",
            tool_input: { file_path: planPath, content: "" }
        }));
        child.stdin.end();
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.parsed?.decision, "block");
    assert.match(result.parsed?.systemMessage ?? "", /baseUrl|ERROR/);
});

test("validate-plan approves valid plan write", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "wux-hook-ok-"));
    const planDir = path.join(cwd, ".web-ux-testing", "plans");
    fs.mkdirSync(planDir, { recursive: true });
    const planPath = path.join(planDir, "good.yaml");
    fs.copyFileSync(path.join(fixtureDir, "plan-valid-example.yaml"), planPath);

    const result = await new Promise((resolve, reject) => {
        const child = spawn("node", [path.join(pluginRoot, "hooks", "validate-plan.mjs")], {
            stdio: ["pipe", "pipe", "pipe"],
            cwd
        });
        const out = []; const err = [];
        child.stdout.on("data", (c) => out.push(c));
        child.stderr.on("data", (c) => err.push(c));
        child.on("error", reject);
        child.on("close", (code) => {
            const stdout = Buffer.concat(out).toString("utf8");
            const stderr = Buffer.concat(err).toString("utf8");
            let parsed = null;
            try { parsed = JSON.parse(stdout); } catch { /* */ }
            resolve({ exitCode: code, stdout, stderr, parsed });
        });
        child.stdin.write(JSON.stringify({
            tool_name: "create",
            tool_input: { file_path: planPath, content: "" }
        }));
        child.stdin.end();
    });
    assert.equal(result.exitCode, 0);
    assert.notEqual(result.parsed?.decision, "block");
});

test("validate-plan ignores writes outside plans/", async () => {
    const result = await runHook("validate-plan.mjs", {
        tool_name: "create",
        tool_input: { file_path: "src/random.js", content: "" }
    });
    assert.equal(result.exitCode, 0);
    // Empty object emitted; not blocked.
    assert.notEqual(result.parsed?.decision, "block");
});
