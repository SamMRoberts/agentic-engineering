# web-ux-test-workflow MCP server

`mcp-workflow/` is the MCP control surface for the `web-ux-test` plugin. It exposes the stateful web UX testing workflow as typed MCP tools so an agent can advance the workflow through validated, single-step operations instead of relying on prose instructions alone.

The server is intentionally thin. It does not duplicate workflow logic, validate plans directly, classify failures directly, or apply repairs itself. Each tool delegates to the plugin's CLI/library layer in `../lib/`, then wraps the result in a consistent MCP response envelope.

## What it controls

The backing `web-ux-test` workflow is a strict state machine for Playwright-based UX testing. It persists state and artifacts under the target repository's `.web-ux-testing/` directory, including plans, generated tests, run records, reports, auth storage, and repair proposals.

The MCP server can:

- initialize the project-local `.web-ux-testing/` layout;
- record and validate YAML test plans;
- report the current workflow state and allowed next actions;
- advance no-payload workflow phases;
- execute the generated Playwright test spec;
- classify the latest failed test run;
- record, approve, and apply a repair proposal;
- generate Markdown and HTML reports for the latest run.

The CLI remains the source of truth for workflow transitions, schema validation, Playwright execution, failure classification, repair safety, state persistence, and report generation.

## Transport

Only stdio transport is supported.

```bash
npm install
npm run start:stdio
```

`npm run start:stdio` runs:

```bash
tsx src/main.ts --stdio
```

The process exits with an error if `--stdio` is omitted.

## Runtime assumptions

Tools run relative to the current working directory of the MCP server process. In normal use, start the server from the repository whose UX workflow should be controlled, or configure the MCP host so this server process has that repository as its working directory.

Most tools require the target repository to already be initialized with `init_project`. Tools that read workflow state fail when `.web-ux-testing/state.json` is missing or invalid.

## Response envelope

Most tools return both text content and structured content. The structured content follows this shape:

```json
{
  "ok": true,
  "state": "plan_validated",
  "nextAllowedActions": ["auth setup", "selectors discover"],
  "artifacts": [],
  "result": {}
}
```

Fields:

- `ok`: whether the underlying operation succeeded.
- `state`: current workflow phase after the tool call, when state can be read.
- `nextAllowedActions`: workflow actions allowed from the current phase.
- `artifacts`: artifact metadata from workflow state.
- `result`: the underlying CLI handler result.

Failed tools set MCP `isError: true` and include errors in `result.errors` when the delegated CLI handler provides them.

`get_workflow_state` returns the same top-level fields but reads state directly instead of wrapping a mutating operation.

## Tools

### `init_project`

Initializes the target repository for `web-ux-test`.

Input: none.

Equivalent CLI behavior: `web-ux-test init`.

Side effects:

- creates `.web-ux-testing/`;
- creates `plans/`, `runs/`, `reports/`, `auth/`, and `generated-tests/`;
- writes default `project.yaml`;
- writes `auth/README.md` and `auth/.gitignore`;
- creates initial workflow state.

The operation is idempotent when the project is already initialized. It reports the existing project directory instead of replacing state.

### `create_test_plan`

Records an existing YAML plan file as the active workflow plan.

Input:

```json
{
  "planPath": ".web-ux-testing/plans/example.yaml"
}
```

Equivalent CLI behavior: `web-ux-test plan create <path>`.

Behavior:

- resolves `planPath` relative to the server working directory when it is not absolute;
- verifies that the file exists;
- parses the YAML;
- requires the plan to have an `id`;
- advances workflow state from `initialized` to `plan_created`.

This tool does not fully schema-validate the plan. Use `validate_test_plan` for schema validation.

### `validate_test_plan`

Schema-validates a YAML test plan and advances workflow state when possible.

Input:

```json
{
  "planPath": ".web-ux-testing/plans/example.yaml"
}
```

Equivalent CLI behavior: `web-ux-test plan validate <path>`.

Behavior:

- resolves `planPath` relative to the server working directory when it is not absolute;
- verifies that the file exists;
- parses the YAML;
- validates it against `test-plan.schema.yaml`;
- if state is `initialized`, records the plan and advances through `plan_created`;
- if state is `plan_created`, advances to `plan_validated`;
- if workflow state is unavailable, still reports validation success with `phase: null`.

Validation failures return schema or YAML parse errors and do not advance state.

### `get_workflow_state`

Returns the current persisted workflow state.

Input: none.

Equivalent CLI behavior: `web-ux-test state show`.

Returns:

- current `phase`;
- active `planId` and `planPath`, when available;
- `generatedTestPath`, when available;
- latest run id, run status, and failure category;
- pending and approved repair ids;
- `nextAllowedActions`;
- low-level allowed events;
- known artifacts.

This tool fails if the target repository has not been initialized or state cannot be read.

### `run_next_workflow_step`

Advances the workflow by one engine-suggested event only when that event requires no payload.

Input: none.

Equivalent CLI behavior: `web-ux-test run next`.

Behavior:

- reads the current phase;
- asks the workflow engine for the next event;
- refuses to advance when the next event requires explicit input;
- advances no-payload events such as `plan_validated`, `auth_configured`, `selectors_discovered`, `test_reviewed`, or `report_generated`.

Use the dedicated payload-bearing tools for plan creation, test execution, failure classification, repair proposal, and repair application. This tool deliberately refuses to guess inputs.

### `run_phase`

Attempts to advance into a specific phase when that target phase can be reached by a no-payload event.

Input:

```json
{
  "targetPhase": "selectors_discovered"
}
```

Equivalent CLI behavior: `web-ux-test run phase <phase>`.

Behavior:

- checks whether the requested phase is reachable from the current phase;
- rejects ambiguous or illegal transitions;
- rejects transitions that require explicit payloads;
- updates state when the matching event is legal and payload-free.

Special case: `targetPhase: "test_executed"` delegates to `run_test_phase`, because test execution is a payload-bearing operation with Playwright side effects.

High-level callers should usually prefer `run_next_workflow_step` or a dedicated tool.

### `run_test_phase`

Executes the generated Playwright spec and records the run result.

Input: none.

Equivalent CLI behavior: `web-ux-test run phase test_executed`.

Behavior:

- requires current phase to be `test_reviewed` or `repair_applied`;
- requires `generatedTestPath` to be present in workflow state;
- runs Playwright against the generated spec;
- writes run artifacts under `.web-ux-testing/runs/<runId>/`;
- advances to `test_executed` for first-run pass or fail outcomes;
- advances to `rerun_passed` when a post-repair rerun passes;
- records run id, run status, exit code, and run directory.

This tool can launch external Playwright execution and may fail because of missing browsers, app server problems, selector failures, or local environment restrictions.

### `classify_latest_failure`

Classifies the latest failed Playwright run.

Input: none.

Equivalent CLI behavior: `web-ux-test failure classify`.

Behavior:

- requires current phase to be `test_executed`;
- requires the latest run status to be `failed`;
- requires a `lastRunId`;
- reads `.web-ux-testing/runs/<lastRunId>/`;
- applies the rule-based classifier;
- advances workflow state to `failure_classified`;
- records the failure category.

This tool fails when the latest run passed, when there is no run id, or when the run directory is missing.

### `propose_repair`

Validates and records a repair proposal.

Input:

```json
{
  "proposalPath": ".web-ux-testing/repairs/proposal.yaml"
}
```

Equivalent CLI behavior: `web-ux-test repair propose --proposal <file>`.

Behavior:

- resolves `proposalPath` relative to the server working directory when it is not absolute;
- verifies that the proposal file exists;
- loads and validates the proposal;
- validates the proposal's file-edit scope against the path allowlist;
- copies the proposal into `.web-ux-testing/repairs/<proposalId>.yaml`;
- advances workflow state to `repair_proposed`.

This tool records a proposal only. It does not approve or apply file edits.

### `approve_repair`

Approves the pending repair proposal.

Input: none.

Equivalent CLI behavior: `web-ux-test repair approve`.

Behavior:

- advances workflow state from `repair_proposed` to `repair_approved`;
- records the approved repair id from workflow state.

This is the explicit approval gate before file edits can be applied.

### `apply_approved_repair`

Applies the approved repair proposal.

Input: none.

Equivalent CLI behavior: `web-ux-test repair apply`.

Behavior:

- requires current phase to be `repair_approved`;
- requires an `approvedRepairId`;
- loads `.web-ux-testing/repairs/<approvedRepairId>.yaml`;
- validates and applies the proposal through the repair subsystem;
- writes a backup under the latest run's repair backup area;
- advances workflow state to `repair_applied`;
- returns the backup path and applied changes.

This is the only MCP tool in this package that can apply repair file edits. It fails closed unless approval is already recorded in workflow state.

### `generate_report`

Generates Markdown and HTML reports for the latest run.

Input: none.

Equivalent CLI behavior: `web-ux-test report generate`.

Behavior:

- requires `lastRunId` in workflow state;
- reads `.web-ux-testing/runs/<lastRunId>/run.json`;
- writes `.web-ux-testing/reports/<lastRunId>.md`;
- writes `.web-ux-testing/reports/<lastRunId>.html`;
- advances workflow state to `report_generated`.

This tool fails when there is no latest run or the run record is missing.

## Typical flow

A full first-run workflow usually follows this shape:

1. `init_project`
2. `create_test_plan`
3. `validate_test_plan`
4. `run_next_workflow_step` or `run_phase` for allowed no-payload setup phases
5. generate and review the Playwright test through the owning CLI/agent workflow
6. `run_test_phase`
7. if the run failed, `classify_latest_failure`
8. optionally `propose_repair`, `approve_repair`, `apply_approved_repair`, then `run_test_phase`
9. `generate_report`

Always consult `get_workflow_state` between steps when an MCP client needs to decide what is legal next.

## Safety model

- The server exposes single-step tools, not a "run everything" macro.
- Workflow state transitions are enforced by the backing state machine.
- Plan validation is schema-backed.
- Repair proposal scope is validated before recording.
- Repair application requires an approved repair in persisted state.
- Repair application writes a backup before editing.
- Auth artifacts live under `.web-ux-testing/auth/`, which is initialized with a restrictive `.gitignore`.

The server itself does not add authentication on top of MCP stdio. Treat access to the server process like access to the local CLI.

## Development

Run type checking:

```bash
npm run build
```

Run the MCP tests:

```bash
npm test
```

The tests use `InMemoryTransport` to list tools, verify error behavior, initialize a temporary workflow project, and validate a fixture plan through the MCP server.
