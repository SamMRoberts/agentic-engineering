// Heuristic failure triage: classify a failed step's error message into a likely
// cause category and suggest a minimal repair. This is a deterministic first
// pass; the debugger subagent refines it with live Playwright MCP evidence.

const RULES = [
  {
    category: "missing_auth",
    confidence: "medium",
    test: (m) => /login|sign in|unauthor|401|403|forbidden|session expired/i.test(m),
    repair: "Verify the storage_state file is fresh and the auth strategy is configured; re-run save-storage-state."
  },
  {
    category: "selector_drift",
    confidence: "medium",
    test: (m) =>
      /resolved to \d+ element|strict mode violation|no element|not found|did not match any elements/i.test(m),
    repair: "Re-discover the element with Playwright MCP and update the step target to an accessible locator."
  },
  {
    category: "timing_issue",
    confidence: "medium",
    test: (m) => /timeout|timed out|waiting for|exceeded/i.test(m),
    repair: "Add or increase a wait_for step before the failing action, or raise timeout_ms; avoid fixed sleeps."
  },
  {
    category: "changed_workflow",
    confidence: "low",
    test: (m) => /not visible|not attached|detached|hidden|navigation|net::ERR|page closed/i.test(m),
    repair: "Inspect the live workflow with Playwright MCP; the UI flow may have changed. Update the plan steps."
  },
  {
    category: "environment_issue",
    confidence: "medium",
    test: (m) => /ECONN|ENOTFOUND|net::ERR_|connection refused|dns|certificate|ssl/i.test(m),
    repair: "Confirm base_url and that the environment is reachable; check VPN/proxy/cert configuration."
  },
  {
    category: "invalid_test_plan",
    confidence: "low",
    test: (m) => /cannot generate step|unsupported action|requires a/i.test(m),
    repair: "Fix the plan: the failing step is malformed. Re-validate with validate-plan."
  }
];

/**
 * Analyze a normalized report (or a single error message) and return a diagnosis.
 * @param {object} report - normalized test report
 * @returns {{category:string, confidence:string, rationale:string, recommended_repairs:string[]}}
 */
export function analyzeFailure(report) {
  const failed = (report.steps ?? []).filter(
    (s) => s.status === "failed" || s.status === "timedout"
  );
  if (failed.length === 0) {
    return {
      category: "unknown",
      confidence: "low",
      rationale: "No failed steps found in the report.",
      recommended_repairs: []
    };
  }

  const messages = failed.map((s) => s.error?.message ?? "").join("\n");
  for (const rule of RULES) {
    if (rule.test(messages)) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        rationale: `Matched failure signature for ${rule.category} in step "${
          failed[0].title ?? failed[0].id
        }".`,
        recommended_repairs: [rule.repair]
      };
    }
  }

  return {
    category: "product_bug",
    confidence: "low",
    rationale:
      "Failure did not match known test/selector/timing/auth/environment signatures; it may be a genuine product bug. Confirm with Playwright MCP and the captured trace.",
    recommended_repairs: [
      "Open the trace and screenshot to confirm the observed vs. expected behavior before filing a bug."
    ]
  };
}
