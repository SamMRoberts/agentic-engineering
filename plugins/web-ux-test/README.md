# web-ux-test

Workflow-enforced Playwright UX testing. The `web-ux-test` CLI is the authority — it owns workflow state, plan validation, Playwright execution, failure classification, and gated repair. A thin MCP server (`web-ux-test-workflow`) exposes the same workflow as high-level tools. Optional Copilot CLI integration is a worker, never the workflow owner.

This plugin is **distinct from** the previously removed `web-ux-testing` plugin. The name is `web-ux-test` and the CLI binary is `web-ux-test`.

## Why this exists

Agents and skills alone proved unreliable for multi-step UX testing — they could skip validation, wander, or claim completion without running tests. This system makes the workflow:

- **Stateful** — every step recorded in `.web-ux-testing/state.json`.
- **Gated** — no phase can advance without passing its `validation` and `pass_conditions`.
- **Inspectable** — `web-ux-test state show` prints the current phase, allowed next actions, and known artifacts.
- **Repeatable** — Playwright spec materialization is deterministic; the failure classifier is rule-based.
- **Hard to bypass** — the workflow engine rejects invalid transitions; hooks re-validate plans after writes and deny credential-shaped literals under `auth/`.

## Install

From this repository:

```bash
cd plugins/web-ux-test
npm install
```

Optionally install Playwright browsers (the runner expects them):

```bash
npx playwright install --with-deps chromium
```

## Initialize a project

In the repository you want to test:

```bash
node /path/to/plugins/web-ux-test/bin/web-ux-test.mjs init
```

Or, if you've added the plugin to your PATH (`npm link` or marketplace install):

```bash
web-ux-test init
```

This creates:

```
.web-ux-testing/
├── project.yaml
├── state.json
├── plans/
├── runs/
├── reports/
├── auth/
│   ├── README.md
│   └── .gitignore        # ignores everything except README.md
└── generated-tests/
```

## Create and validate a test plan

Fresh workflow starts begin with requirements capture before initialization, plan creation, or execution. Capture the target URL, auth posture, primary flow, expected success signal, and browser first.

Drop a YAML file under `.web-ux-testing/plans/`. See `docs/test-plan-schema.md` and `templates/example-plan.yaml` for the full shape.

```bash
web-ux-test plan validate .web-ux-testing/plans/my-flow.yaml
```

Invalid plans produce structured error output and a non-zero exit code.

## Run the workflow

Every command advances exactly one phase. The engine prevents invalid transitions.

```bash
web-ux-test run next
```

You can also target a specific phase:

```bash
web-ux-test run phase test_executed
```

Attempting a phase that is not the current legal next phase exits non-zero with a clear transition error.

## Reports

```bash
web-ux-test report generate
```

Produces both `.web-ux-testing/reports/<run-id>.md` and `.web-ux-testing/reports/<run-id>.html`.

## MCP server

Start the workflow MCP server via stdio:

```bash
cd mcp-workflow
npm install
npm run start:stdio
```

Exposed tools (high-level only):

- `create_test_plan`
- `validate_test_plan`
- `get_workflow_state`
- `run_next_workflow_step`
- `run_test_phase`
- `classify_latest_failure`
- `propose_repair`
- `approve_repair`
- `apply_approved_repair`
- `generate_report`

See `docs/mcp.md` for the full input/output shapes.

## Safety defaults

- `.web-ux-testing/auth/` is gitignored on `init`. The `deny-auth-credentials` PreToolUse hook rejects writes under `auth/` that contain credential-shaped literals.
- `validate-plan` PostToolUse hook re-validates `.web-ux-testing/plans/*.yaml` after any tool writes one, returning `decision: block` if invalid.
- The repair loop never auto-applies. `repair apply` exits non-zero unless state is `repair_approved`, and writes a backup under `runs/<run-id>/repair-backup/` before editing.

## Testing this plugin

```bash
cd plugins/web-ux-test
npm test
```

`node --test test/**/*.test.mjs` runs unit and integration tests for the schemas, engine, store, CLI, classifier, reports, repair loop, hooks, and MCP wrappers.

## Documentation

- `docs/workflow.md` — the 14 phases and transition rules
- `docs/test-plan-schema.md` — plan YAML reference
- `docs/auth.md` — storage-state setup and credential safety
- `docs/mcp.md` — MCP tool reference
- `docs/copilot-cli-adapter.md` — Copilot CLI integration contract (MVP: stubs only)

## Known limitations (MVP)

- Single browser per run.
- Copilot CLI adapter ships as stubs documented in `docs/copilot-cli-adapter.md`; the contract is locked so future implementation is purely additive.
- No MCP App UI in this release.
- No visual diffing or accessibility audits beyond Playwright defaults.

## License

MIT. See `LICENSE`.
