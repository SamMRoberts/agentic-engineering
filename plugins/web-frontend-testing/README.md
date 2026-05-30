# web-frontend-testing

Orchestrated Playwright workflow for web frontend testing. The plugin coordinates intake, codebase scanning, plan generation, execution, and reporting through one user-facing orchestrator and a small set of private subagents.

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

The orchestrator stops on missing intake details (URL, stage, auth, runner, destructive-action policy) rather than guessing.

## Validation commands

From `plugins/web-frontend-testing`:

```bash
# Run schema, lint, hook, and generator tests
npm test

# Validate a single plan
npm run validate:plan -- ./reports/web-frontend-testing/<timestamp>/test-plan.yaml

# Generate Playwright CLI specs from a validated plan
npm run generate:tests -- --plan ./reports/web-frontend-testing/<timestamp>/test-plan.yaml --out tests/web-frontend
```

Exit codes for the validators and generator: `0` on success, `1` on validation errors, `2` on bad usage or missing files.

## Safety defaults

- Plans must not contain credential-shaped strings; use `${ENV_VAR}` or storage-state paths.
- Production targets are blocked unless the user explicitly approves read-only execution.
- Destructive scenarios must be `P1` and require explicit user confirmation before execution.
- CLI sessions must not log secrets; pre-test auth sessions never type, paste, or screenshot credentials.
- `pre_test_auth_session` is incompatible with `auth_strategy: per_test_seed`.
- `playwright/browser_evaluate` invocations require user approval via the `confirm-browser-evaluate` hook.

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
├── schemas/                        # JSON Schema (draft 2020-12) for test plans
└── test/                           # node:test suites and fixtures
```

## Architecture and delegation

The orchestrator agent owns request classification and stops on missing safety details. Every stage is delegated to a private subagent; the orchestrator does not edit files, run shell commands, or drive browser tools. The plan agent chooses the runner per the policy above and propagates it through every handoff. CLI execution is isolated in its own private agent so MCP and CLI tool surfaces stay separate.

## Known limitations

- The CLI runner requires the consuming repository to have Playwright installed (typically via `@playwright/test`).
- The plan validator does not currently lint generated `.spec.ts` files; CI in the consuming repo should run `npx playwright test --list` as a discovery sanity check.
- The optional MCP App under `mcp-app/` is independent of CLI workflow changes.
