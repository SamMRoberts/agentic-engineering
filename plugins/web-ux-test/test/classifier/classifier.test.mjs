import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classify } from "../../lib/classifier/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, "../fixtures/classifier");

function loadStdout(name) {
    const file = path.join(fixtureDir, `${name}.stdout.txt`);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}
function loadStderr(name) {
    const file = path.join(fixtureDir, `${name}.stderr.txt`);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const cases = [
    { name: "selector_not_found", expected: "selector_not_found" },
    { name: "timeout", expected: "timeout" },
    { name: "navigation_failure", expected: "navigation_failure" },
    { name: "auth_failure", expected: "auth_failure" },
    { name: "assertion_failure", expected: "assertion_failure" },
    { name: "network_failure", expected: "network_failure" },
    { name: "application_error", expected: "application_error" },
    { name: "unknown", expected: "unknown" }
];

for (const c of cases) {
    test(`classifier categorizes ${c.name} fixture as ${c.expected}`, () => {
        const result = classify({ stdout: loadStdout(c.name), stderr: loadStderr(c.name) });
        assert.equal(result.category, c.expected, `matched rule was: ${result.matchedRule}`);
    });
}

test("classifier extracts a non-empty error summary for known failures", () => {
    const result = classify({ stdout: loadStdout("selector_not_found") });
    assert.ok(result.errorSummary.length > 0);
});

test("classifier returns unknown for empty input", () => {
    const result = classify({ stdout: "", stderr: "" });
    assert.equal(result.category, "unknown");
});
