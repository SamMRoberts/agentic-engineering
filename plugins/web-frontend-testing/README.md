# web-frontend-testing

Orchestrated Playwright workflow for web frontend testing. The plugin coordinates intake, codebase scanning, plan generation, execution, reporting, and interactive report review through one user-facing orchestrator and a small set of private subagents.

Playwright CLI is the preferred runner for execution and regression work. Playwright MCP remains available for live browser exploration, scenario discovery, and MCP-specific evidence capture. A `hybrid` runner supports MCP discovery followed by CLI regression.

## What it provides

- **Entrypoint agent**: `web-frontend-testing` (the only user-invocable agent).
- **Private subagents**:
  - `web-frontend-testing-requirements` — intake gating, codebase scan, surface inventory.
  - `web-frontend-testing-plan` — `test-plan.yaml` generation and validation.
  - `web-frontend-testing-cli-execution` — Playwright CLI execution with optional visible session and pre-test manual authentication.
  - `web-frontend-testing-execution` — Playwright MCP execution for exploration and MCP scenarios.
  - `web-frontend-testing-results` — engineering + executive reports.
- **Skills**:
  - `scan-web-frontend-codebase`
  - `generate-web-frontend-test-plan`
  - `convert-web-frontend-plan-to-playwright-tests`
  - `run-playwright-cli-frontend-test`
  - `execute-playwright-mcp-scenario`
  - `write-web-frontend-engineering-report`
  - `write-web-frontend-executive-report`
- **Schemas, hooks, and validators** that enforce the plan contract, block credential literals, and require approval for `playwright/browser_evaluate`.
- **MCP workflow gatekeeper**: `mcp-workflow/` registers `web-frontend-testing-workflow`, which lets default agents validate intake, validate/save plans, record plan approvals, request one approved execution target, record results, and check report readiness when a host cannot select the custom orchestrator agent.
- **MCP report viewer app**: `mcp-app/` registers `web-frontend-report-viewer`, which exposes `view_executive_report` for interactive report triage and `update_test_plan` for confirmation-gated plan edits.

## Runner selection

- `playwright-cli` (default): execute existing or generated Playwright specs, plan-supplied test commands, or grep targets. Supports `show_cli_session` and `pre_test_auth_session`.
- `playwright-mcp`: live browser exploration or MCP evidence capture only.
- `hybrid`: MCP discovery first, then CLI regression on the converted scenarios.

The plan validator rejects `playwright-cli`/`hybrid` plans that do not declare a deterministic CLI target.

## CLI session controls

When the plan uses `playwright-cli` or `hybrid`, two interactive controls are available:

- `cli_session.show_cli_session: true` — surface the running CLI session (headed mode, visible stream) so the user can watch progress.
- `cli_session.pre_test_auth_session.enabled: true` — start/show the CLI session **before** tests run so the user can authenticate manually. The agent waits for the configured `ready_signal` (`user_confirmation`, `storage_state_written`, or `exit_code`) before continuing to the selected test target.

Both options can be set at the plan level or overridden per scenario. The validator enforces that `pre_test_auth_session` is only enabled with `auth_strategy` of `none`, `shared`, or `storage_state`.

## Install

This plugin lives at `plugins/web-frontend-testing` in this repo. Install dependencies from the plugin directory:

```bash
cd plugins/web-frontend-testing
npm install
```

## Usage examples

Ask the orchestrator agent for one of:

- "Scan this repository and propose a Playwright CLI test plan for the frontend."
- "Run the approved CLI scenarios against http://localhost:3000 and capture artifacts."
- "Start a visible Playwright CLI session so I can sign in manually before tests run."
- "Convert approved scenarios into Playwright CLI specs under `tests/web-frontend`."
- "Explore the frontend interactively with Playwright MCP and capture evidence."
- "Generate the engineering and executive reports for the latest test run."
- "Open the interactive report viewer for the latest web frontend test report."

The orchestrator stops on missing intake details (URL, stage, auth, runner, destructive-action policy) rather than guessing.

## Default-agent fallback

Use the `web-frontend-testing` custom orchestrator agent when the host supports custom agent selection. If the host only exposes a default coding agent, start with `web-frontend-testing-workflow/start_workflow` and follow the returned runbook. The workflow MCP server is the portable safety gatekeeper; it does not run Playwright or shell commands itself.

Fallback stage order:

1. Call `web-frontend-testing-workflow/start_workflow`.
2. Call `validate_intake` with target, stage, auth strategy, runner, scope, destructive-action policy, and CLI session preferences.
3. Call `scan_surface_inventory` to collect routes, test files, package scripts, and Playwright config candidates.
4. Draft or update `test-plan.yaml` using the same plan contract as the custom orchestrator path.
5. Call `validate_test_plan` and `save_test_plan`; non-dry writes require `confirmedWrite: true` and valid plan content.
6. Ask the user to review/edit or approve the plan as-is.
7. Call `approve_test_plan` only after explicit user approval. Approval is bound to the current plan hash, so any plan edit requires re-approval.
8. Call `get_next_execution_target`; execute only the returned target, using the host's normal shell or Playwright MCP tools.
9. Call `record_execution_result` for that target before requesting another target.
10. Generate reports, call `validate_report_ready`, then open `web-frontend-report-viewer/view_executive_report`.

If the host exposes an `agent` tool, the default agent may delegate each stage to the existing private agents exactly as the custom orchestrator would. If nested agents are unavailable, the default agent should perform the stages inline and let `web-frontend-testing-workflow` enforce the safety gates. The fallback must not invoke private subagents directly as user-facing agents, skip plan approval, execute multiple targets at once, or run production/destructive scenarios without the required explicit approvals.

## Validation commands

From `plugins/web-frontend-testing`:

```bash
# Run schema, lint, hook, and generator tests
npm test

# Validate a single plan
npm run validate:plan -- ./reports/web-frontend-testing/<timestamp>/test-plan.yaml

# Generate Playwright CLI specs from a validated plan
npm run generate:tests -- --plan ./reports/web-frontend-testing/<timestamp>/test-plan.yaml --out tests/web-frontend

# Run MCP report viewer tests
npm run test:mcp-app

# Build the MCP report viewer bundle
npm run build:mcp-app

# Run MCP workflow gatekeeper tests
npm run test:mcp-workflow

# Type-check the MCP workflow gatekeeper
npm run build:mcp-workflow
```

Exit codes for the validators and generator: `0` on success, `1` on validation errors, `2` on bad usage or missing files.

## Safety defaults

- Plans must not contain credential-shaped strings; use `${ENV_VAR}` or storage-state paths.
- Production targets are blocked unless the user explicitly approves read-only execution.
- Destructive scenarios must be `P1` and require explicit user confirmation before execution.
- CLI sessions must not log secrets; pre-test auth sessions never type, paste, or screenshot credentials.
- `pre_test_auth_session` is incompatible with `auth_strategy: per_test_seed`.
- `playwright/browser_evaluate` invocations require user approval via the `confirm-browser-evaluate` hook.
- `web-frontend-report-viewer/update_test_plan` validates dry runs without writing. Non-dry writes require explicit `confirmedWrite: true` and still refuse invalid plans.

## Package structure

```
plugins/web-frontend-testing/
├── plugin.json                     # Copilot/Codex CLI manifest
├── .codex-plugin/plugin.json       # Codex marketplace manifest
├── .claude-plugin/plugin.json      # Claude Code manifest
├── .mcp.json                       # Playwright MCP server entry
├── hooks.json                      # Lifecycle hook registrations
├── package.json                    # npm scripts and dependencies
├── README.md                       # this file
├── CHANGELOG.md                    # semver history
├── agents/                         # entrypoint + private subagents
├── skills/                         # SKILL.md per workflow step
├── hooks/                          # block credentials, gate evaluate, validate plan
├── lib/                            # shared validators, schema utils, yaml utils
├── mcp-app/                        # MCP report viewer app and report-plan editor
├── mcp-workflow/                   # MCP workflow gatekeeper for default-agent fallback
├── schemas/                        # JSON Schema (draft 2020-12) for test plans
└── test/                           # node:test suites and fixtures
```

## Architecture and delegation

The orchestrator agent owns request classification and stops on missing safety details. Every stage is delegated to a private subagent; the orchestrator does not edit files, run shell commands, or drive browser tools. The plan agent chooses the runner per the policy above and propagates it through every handoff. CLI execution is isolated in its own private agent so MCP and CLI tool surfaces stay separate. The results agent can open the registered MCP report viewer after both static report artifacts exist; the plan agent can use the viewer's plan update tool only after a passing dry run and explicit user confirmation.

For default-agent-only hosts, `web-frontend-testing-workflow` preserves the same gates by storing workflow state in the report directory and tying approval to a plan hash. It returns one approved execution target at a time; the host agent still owns any shell, browser, or Playwright MCP execution permitted by that host.

## Known limitations

- The CLI runner requires the consuming repository to have Playwright installed (typically via `@playwright/test`).
- The plan validator does not currently lint generated `.spec.ts` files; CI in the consuming repo should run `npx playwright test --list` as a discovery sanity check.
- The workflow MCP fallback gates compliant agents, but it cannot prevent a host from directly exposing shell or browser tools outside the workflow. Keep hooks enabled where the host supports them.
- The MCP report viewer requires a host that supports MCP App resources for the interactive UI. Non-UI hosts still receive the tool's plain-text fallback summary.
