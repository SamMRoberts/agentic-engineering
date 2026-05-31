#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const gitignore = path.resolve(process.cwd(), ".web-ux-testing/auth/.gitignore");
if (!fs.existsSync(gitignore)) {
    process.stderr.write(`ERROR: ${gitignore} not found. Run \`web-ux-test auth setup\` first.\n`);
    process.exit(1);
}
const contents = fs.readFileSync(gitignore, "utf8");
if (!/^\*$/m.test(contents)) {
    process.stderr.write(`ERROR: ${gitignore} does not ignore everything (missing \`*\` rule).\n`);
    process.exit(1);
}
process.stdout.write(`OK ${gitignore}: auth directory is gitignored.\n`);
