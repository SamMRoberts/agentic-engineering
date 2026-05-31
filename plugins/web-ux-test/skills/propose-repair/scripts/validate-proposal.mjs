#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../../..");
const { loadProposal, validateProposalScope } = await import(path.join(pluginRoot, "lib", "repair", "proposal.mjs"));

const proposalPath = process.argv[2];
if (!proposalPath) {
    process.stderr.write("ERROR: usage: validate-proposal.mjs <path>\n");
    process.exit(2);
}

const { ok, errors, proposal } = loadProposal(proposalPath);
if (!ok) {
    for (const err of errors) process.stderr.write(`ERROR ${proposalPath}: ${err}\n`);
    process.exit(1);
}
const scopeErrors = validateProposalScope(proposal);
if (scopeErrors.length) {
    for (const err of scopeErrors) process.stderr.write(`ERROR ${proposalPath}: ${err}\n`);
    process.exit(1);
}
process.stdout.write(`OK ${proposalPath}: repair proposal is valid and in scope.\n`);
