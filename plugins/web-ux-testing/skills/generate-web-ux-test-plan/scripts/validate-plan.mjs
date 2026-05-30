#!/usr/bin/env node

import { runValidatePlanCli } from "../../../lib/plan-validation.mjs";

runValidatePlanCli({
  usage: "Usage: node skills/generate-web-ux-test-plan/scripts/validate-plan.mjs <path-to-plan.yaml>"
});
