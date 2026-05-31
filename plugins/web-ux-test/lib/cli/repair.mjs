/**
 * `web-ux-test repair ...` — propose, approve, apply repair proposals.
 *
 * Delegates to lib/repair/proposal.mjs for validation and transactional apply.
 */

import fs from "node:fs";
import path from "node:path";

import { readState, updateState, projectDir } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";
import {
    loadProposal,
    saveProposal,
    applyProposal,
    validateProposalScope
} from "../repair/proposal.mjs";

function repairsDir(cwd) {
    return path.join(projectDir(cwd), "repairs");
}

export async function runRepairPropose({ cwd = process.cwd(), proposalPath } = {}) {
    if (!proposalPath) {
        return { ok: false, errors: ["repair propose requires --proposal <file>"] };
    }
    const absolute = path.isAbsolute(proposalPath) ? proposalPath : path.resolve(cwd, proposalPath);
    if (!fs.existsSync(absolute)) {
        return { ok: false, errors: [`Proposal file not found: ${absolute}`] };
    }
    const { ok, errors, proposal } = loadProposal(absolute);
    if (!ok) return { ok: false, errors };
    const scopeErrors = validateProposalScope(proposal);
    if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
    }
    // Copy proposal into repairs dir for traceability.
    fs.mkdirSync(repairsDir(cwd), { recursive: true });
    const destPath = path.join(repairsDir(cwd), `${proposal.proposalId}.yaml`);
    saveProposal(proposal, destPath);

    const next = await updateState((state) => {
        const r = transition(state, EVENTS.REPAIR_PROPOSED, { proposalId: proposal.proposalId });
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return { ok: true, phase: next.phase, proposalId: proposal.proposalId, savedTo: destPath };
}

export async function runRepairApprove({ cwd = process.cwd() } = {}) {
    const next = await updateState((state) => {
        const r = transition(state, EVENTS.REPAIR_APPROVED);
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return { ok: true, phase: next.phase, approvedRepairId: next.approvedRepairId };
}

export async function runRepairApply({ cwd = process.cwd() } = {}) {
    const current = readState(cwd);
    if (current.phase !== "repair_approved") {
        return { ok: false, errors: [`Cannot apply repair from phase "${current.phase}". Approval required.`] };
    }
    if (!current.approvedRepairId) {
        return { ok: false, errors: ["No approvedRepairId in state."] };
    }
    const proposalPath = path.join(repairsDir(cwd), `${current.approvedRepairId}.yaml`);
    if (!fs.existsSync(proposalPath)) {
        return { ok: false, errors: [`Approved proposal file missing: ${proposalPath}`] };
    }
    const { ok, errors, proposal } = loadProposal(proposalPath);
    if (!ok) return { ok: false, errors };

    const applyResult = applyProposal({
        proposal,
        cwd,
        runId: current.lastRunId ?? "unknown-run"
    });
    if (!applyResult.ok) {
        return { ok: false, errors: applyResult.errors };
    }
    const next = await updateState((state) => {
        const r = transition(state, EVENTS.REPAIR_APPLIED);
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return { ok: true, phase: next.phase, backupPath: applyResult.backupPath, changes: applyResult.changes };
}
