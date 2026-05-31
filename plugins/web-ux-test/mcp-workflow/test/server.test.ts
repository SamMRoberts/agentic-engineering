import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../src/server.ts";

async function connectClient(cwd: string) {
    // Run all server tools with the project cwd by chdir'ing the test process.
    process.chdir(cwd);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: {} });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { server, client };
}

function mktmp(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "wux-mcp-"));
}

test("MCP: list_tools includes every documented workflow tool", async () => {
    const cwd = mktmp();
    const { client } = await connectClient(cwd);
    const list = await client.listTools();
    const names = list.tools.map((t) => t.name);
    for (const expected of [
        "create_test_plan",
        "validate_test_plan",
        "get_workflow_state",
        "run_next_workflow_step",
        "run_test_phase",
        "classify_latest_failure",
        "propose_repair",
        "approve_repair",
        "apply_approved_repair",
        "generate_report"
    ]) {
        assert.ok(names.includes(expected), `missing tool: ${expected}`);
    }
});

test("MCP: get_workflow_state errors when project is not initialized", async () => {
    const cwd = mktmp();
    const { client } = await connectClient(cwd);
    const result = await client.callTool({ name: "get_workflow_state", arguments: {} });
    assert.equal(result.isError, true);
});

test("MCP: init_project then get_workflow_state returns initialized", async () => {
    const cwd = mktmp();
    const { client } = await connectClient(cwd);
    const initRes = await client.callTool({ name: "init_project", arguments: {} });
    assert.equal(initRes.isError, undefined);
    const stateRes = await client.callTool({ name: "get_workflow_state", arguments: {} });
    assert.equal((stateRes.structuredContent as { state: string }).state, "initialized");
});

test("MCP: validate_test_plan accepts the spec example and advances workflow", async () => {
    const cwd = mktmp();
    const { client } = await connectClient(cwd);
    await client.callTool({ name: "init_project", arguments: {} });
    // Copy fixture into the temp project's plans/ for realism (but absolute path also works).
    const planFixture = path.resolve(import.meta.dirname, "../../test/fixtures/plan-valid-example.yaml");
    const res = await client.callTool({ name: "validate_test_plan", arguments: { planPath: planFixture } });
    assert.equal(res.isError, undefined, JSON.stringify(res.structuredContent));
    const state = (res.structuredContent as { state: string }).state;
    assert.equal(state, "plan_validated");
});

test("MCP: run_next_workflow_step from initialized refuses to advance without input", async () => {
    const cwd = mktmp();
    const { client } = await connectClient(cwd);
    await client.callTool({ name: "init_project", arguments: {} });
    const res = await client.callTool({ name: "run_next_workflow_step", arguments: {} });
    assert.equal(res.isError, true);
});
