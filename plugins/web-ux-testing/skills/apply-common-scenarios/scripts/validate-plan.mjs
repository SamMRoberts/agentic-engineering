#!/usr/bin/env node

import { runValidatePlanCli } from "../../../lib/plan-validation.mjs";

runValidatePlanCli({
  usage: "Usage: node skills/apply-common-scenarios/scripts/validate-plan.mjs <path-to-plan.yaml>"
});
