---
name: web-ux-gremlin-discovery
description: "Private helper for web-ux-gremlin. Use only to preflight target reachability, Playwright project readiness, auth and safety constraints, execution controls, and the normalized run contract before UX bug-hunt work."
argument-hint: "Target URL/app start path, scope, mode, execution controls, auth model, safety constraints"
user-invocable: false
---

# Web UX Gremlin Discovery

Confirm the target, scope, safety gate, and run contract before any planning or execution.

## Procedure

1. Verify the workspace is the target Playwright project root or has a clear target project path.
2. Check for `package.json`, `playwright.config.*`, `tests/`, and `specs/`; report missing pieces.
3. Verify the target URL with a lightweight HTTP probe or record the start command and expected readiness URL.
4. Confirm Playwright agent/MCP availability when the selected tool is MCP.
5. Collect execution controls from `../web-ux-gremlin/checklists/run-contract.md`.
6. Apply stop conditions from the public skill.

## Output

Return the shared context block from `../web-ux-gremlin/checklists/stage-handoffs.md`, the exact run contract, readiness status, and blockers.
