/**
 * Repair proposal validation, persistence, and transactional apply.
 *
 * Allowlist for proposed file targets:
 *   - .web-ux-testing/plans/**
 *   - generated-tests/**
 *
 * Proposals never auto-apply. The CLI's `repair apply` checks the workflow
 * state first; this module enforces path scope and creates per-proposal
 * backups before mutating any file.
 */

import fs from "node:fs";
import path from "node:path";

import { readYamlFile, stringifyYaml, parseYaml } from "../yaml-utils.mjs";
import { validateAgainstSchema } from "../schema-utils.mjs";
import { projectDir } from "../state/store.mjs";

const ALLOWED_PREFIXES = [
    ".web-ux-testing/plans/",
    "generated-tests/",
    ".web-ux-testing/generated-tests/"
];

export function loadProposal(filePath) {
    let parsed;
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        parsed = filePath.endsWith(".json") ? JSON.parse(raw) : parseYaml(raw);
    } catch (err) {
        return { ok: false, errors: [`Failed to read proposal ${filePath}: ${err.message}`] };
    }
    const errors = validateAgainstSchema(parsed, "repair-proposal.schema.yaml");
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true, proposal: parsed };
}

export function saveProposal(proposal, destPath) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, stringifyYaml(proposal));
}

export function validateProposalScope(proposal) {
    const errors = [];
    for (const change of proposal.proposedChanges ?? []) {
        const target = change.file.replace(/^\.\//, "");
        const inScope = ALLOWED_PREFIXES.some((prefix) => target.startsWith(prefix));
        if (!inScope) {
            errors.push(
                `Proposed change targets out-of-scope file "${change.file}". Allowed prefixes: ${ALLOWED_PREFIXES.join(", ")}`
            );
        }
    }
    return errors;
}

/**
 * Apply a proposal transactionally.
 *
 * - For each change, if `before` is present in the file, replace the first occurrence with `after`.
 * - If `before` is empty/null, the change is treated as an append.
 * - On any failure, restore from backup.
 */
export function applyProposal({ proposal, cwd = process.cwd(), runId }) {
    const scopeErrors = validateProposalScope(proposal);
    if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
    }
    const backupDir = path.join(projectDir(cwd), "runs", runId, "repair-backup", proposal.proposalId);
    fs.mkdirSync(backupDir, { recursive: true });
    const applied = [];

    try {
        for (const change of proposal.proposedChanges) {
            const target = path.isAbsolute(change.file) ? change.file : path.resolve(cwd, change.file);
            if (!fs.existsSync(target)) {
                throw new Error(`Target file not found: ${change.file}`);
            }
            const original = fs.readFileSync(target, "utf8");
            // Back up original (preserve relative directory structure inside backupDir).
            const backupPath = path.join(backupDir, change.file);
            fs.mkdirSync(path.dirname(backupPath), { recursive: true });
            fs.writeFileSync(backupPath, original);

            let updated;
            if (typeof change.before === "string" && change.before.length > 0) {
                if (!original.includes(change.before)) {
                    throw new Error(`"before" string not found in ${change.file}; aborting.`);
                }
                updated = original.replace(change.before, change.after ?? "");
            } else {
                updated = original + (original.endsWith("\n") ? "" : "\n") + (change.after ?? "");
            }
            fs.writeFileSync(target, updated);
            applied.push({ file: change.file, backupPath });
        }
    } catch (err) {
        // Rollback.
        for (const a of applied) {
            try {
                const restored = fs.readFileSync(a.backupPath, "utf8");
                const target = path.isAbsolute(a.file) ? a.file : path.resolve(cwd, a.file);
                fs.writeFileSync(target, restored);
            } catch {
                // best-effort
            }
        }
        return { ok: false, errors: [`Apply failed and rolled back: ${err.message}`] };
    }
    return { ok: true, backupPath: backupDir, changes: applied };
}

// Helper kept for tests / future use.
export { readYamlFile };
