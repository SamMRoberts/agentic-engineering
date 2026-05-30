import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { generatePlaywrightTestsFromPlanFile } from "../skills/convert-web-ux-plan-to-playwright-tests/scripts/generate-playwright-tests.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = (...parts) => path.join(__dirname, "fixtures", "plans", ...parts);

describe("generatePlaywrightTestsFromPlanFile", () => {
  it("compiles stable executable steps into a Playwright spec", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-tests-"));
    const result = generatePlaywrightTestsFromPlanFile(fixturePath("executable-steps-plan.yaml"), { outDir });

    assert.equal(result.generated.length, 1);

    const spec = fs.readFileSync(result.generated[0].filePath, "utf8");
    assert.match(spec, /test\("FORM-EXEC-001: Checkout email validation"/);
    assert.match(spec, /await page\.goto\("\/checkout"\);/);
    assert.match(spec, /page\.getByLabel\("Email"\)/);
    assert.match(spec, /page\.getByRole\("button", \{ name: "Continue" \}\)/);
    assert.match(spec, /await expect\(page\.getByText\("Enter a valid email address"\)\)\.toBeVisible\(\);/);
  });
});