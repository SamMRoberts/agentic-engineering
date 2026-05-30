#!/usr/bin/env node

import { runValidatePlanCli } from "../../../lib/plan-validation.mjs";

runValidatePlanCli({
  usage: "Usage: node skills/convert-web-ux-plan-to-playwright-tests/scripts/validate-plan.mjs <path-to-plan.yaml>"
});
