import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
    loadProposal,
    validateProposalScope,
    applyProposal
} from "../../lib/repair/proposal.mjs";
import { stringifyYaml } from "../../lib/yaml-utils.mjs";

function mktmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "wux-repair-"));
}

function writeProposal(filePath, proposal) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, stringifyYaml(proposal));
}

const baseProposal = (overrides = {}) => ({
    proposalId: "repair-2026-05-31T12-00-00-create-page-flow",
    runId: "2026-05-31T12-00-00-create-page-flow",
    failureCategory: "selector_not_found",
    summary: "Replace brittle text selector with a data-testid selector.",
    proposedChanges: [
        {
            file: ".web-ux-testing/plans/create-page-flow.yaml",
            reason: "Use data-testid for stability.",
            before: "text=Add New",
            after: "[data-testid='add-new-button']"
        }
    ],
    requiresApproval: true,
    approvedAt: null,
    appliedAt: null,
    backupPath: null,
    ...overrides
});

test("loadProposal accepts a well-formed YAML proposal", () => {
    const cwd = mktmp();
    const file = path.join(cwd, "p.yaml");
    writeProposal(file, baseProposal());
    const result = loadProposal(file);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test("loadProposal rejects requiresApproval=false", () => {
    const cwd = mktmp();
    const file = path.join(cwd, "p.yaml");
    writeProposal(file, baseProposal({ requiresApproval: false }));
    const result = loadProposal(file);
    assert.equal(result.ok, false);
});

test("validateProposalScope rejects out-of-scope targets", () => {
    const proposal = baseProposal({
        proposedChanges: [
            { file: "src/auth.ts", reason: "x", before: "a", after: "b" }
        ]
    });
    const errors = validateProposalScope(proposal);
    assert.ok(errors.length > 0);
    assert.match(errors.join(" "), /out-of-scope/);
});

test("applyProposal performs replacement and creates a backup", () => {
    const cwd = mktmp();
    // Create project structure and the target plan with the "before" text present.
    fs.mkdirSync(path.join(cwd, ".web-ux-testing", "plans"), { recursive: true });
    const planFile = path.join(cwd, ".web-ux-testing", "plans", "create-page-flow.yaml");
    fs.writeFileSync(planFile, "selector: text=Add New\n");
    const result = applyProposal({ proposal: baseProposal(), cwd, runId: "r-1" });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    const after = fs.readFileSync(planFile, "utf8");
    assert.match(after, /\[data-testid='add-new-button'\]/);
    // Backup exists at the expected location.
    const backup = path.join(cwd, ".web-ux-testing", "runs", "r-1", "repair-backup", "repair-2026-05-31T12-00-00-create-page-flow", ".web-ux-testing", "plans", "create-page-flow.yaml");
    assert.ok(fs.existsSync(backup), `expected backup at ${backup}`);
    const backupContents = fs.readFileSync(backup, "utf8");
    assert.match(backupContents, /text=Add New/);
});

test("applyProposal rolls back when before-text is missing", () => {
    const cwd = mktmp();
    fs.mkdirSync(path.join(cwd, ".web-ux-testing", "plans"), { recursive: true });
    const planFile = path.join(cwd, ".web-ux-testing", "plans", "create-page-flow.yaml");
    const original = "selector: text=Something Different\n";
    fs.writeFileSync(planFile, original);
    const result = applyProposal({ proposal: baseProposal(), cwd, runId: "r-2" });
    assert.equal(result.ok, false);
    const after = fs.readFileSync(planFile, "utf8");
    assert.equal(after, original);
});
