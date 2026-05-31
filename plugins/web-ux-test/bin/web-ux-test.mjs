#!/usr/bin/env node
/**
 * web-ux-test CLI entrypoint.
 *
 * Every command delegates to a single-purpose handler in lib/cli/. The CLI
 * itself only parses arguments and prints results; all workflow logic lives
 * in the lib layer so the MCP server can reuse it.
 */

import { Command } from "commander";

import { runInit } from "../lib/cli/init.mjs";
import { runPlanCreate, runPlanValidate } from "../lib/cli/plan.mjs";
import { runStateShow, runStateValidate } from "../lib/cli/state.mjs";
import { runNext, runPhase } from "../lib/cli/run.mjs";
import { runAuthSetup } from "../lib/cli/auth.mjs";
import { runSelectorsDiscover } from "../lib/cli/selectors.mjs";
import { runTestGenerate, runTestReview } from "../lib/cli/test.mjs";
import { runFailureClassify } from "../lib/cli/failure.mjs";
import { runRepairApply, runRepairApprove, runRepairPropose } from "../lib/cli/repair.mjs";
import { runReportGenerate } from "../lib/cli/report.mjs";
import { runAgentStub } from "../lib/cli/agent.mjs";
import { runRunTestExecuted } from "../lib/cli/execute.mjs";

function printOk(result) {
    // Pretty-print but stay JSON-parseable for scripted consumers.
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

function printErr(result) {
    process.stderr.write("ERROR: " + (Array.isArray(result?.errors) ? result.errors.join("\n  ") : String(result?.errors ?? "Unknown error")) + "\n");
}

function handleResult(result) {
    if (result?.ok) {
        printOk(result);
        process.exit(0);
    } else {
        printErr(result);
        process.exit(1);
    }
}

async function safeRun(fn) {
    try {
        const result = await fn();
        handleResult(result);
    } catch (err) {
        printErr({ errors: [err?.message ?? String(err)] });
        process.exit(1);
    }
}

const program = new Command();
program
    .name("web-ux-test")
    .description("Workflow-enforced Playwright UX testing. The CLI is the authority — never let an agent skip a gate.")
    .version("0.1.0");

program.command("init")
    .description("Initialize .web-ux-testing/ project layout in the current directory.")
    .option("--force", "Reset state.json if it already exists (sub-directories are preserved).")
    .action((opts) => safeRun(() => runInit({ force: !!opts.force })));

// plan
const plan = program.command("plan").description("Create or validate a test plan.");
plan.command("create <path>")
    .description("Record an existing plan YAML as the active plan (advances to phase plan_created).")
    .action((p) => safeRun(() => runPlanCreate({ planPath: p })));
plan.command("validate <path>")
    .description("Schema-validate a plan YAML. Also advances the workflow when possible.")
    .action((p) => safeRun(() => runPlanValidate({ planPath: p })));

// auth
const auth = program.command("auth").description("Storage-state auth scaffolding.");
auth.command("setup")
    .description("Scaffold .web-ux-testing/auth/ and advance to phase auth_configured.")
    .action(() => safeRun(() => runAuthSetup()));

// selectors
const selectors = program.command("selectors").description("Selector discovery commands.");
selectors.command("discover")
    .description("Mark selectors as discovered (MVP: manual). Advances to phase selectors_discovered.")
    .action(() => safeRun(() => runSelectorsDiscover()));

// test
const test = program.command("test").description("Generate and review Playwright specs from the plan.");
test.command("generate")
    .description("Materialize the active plan into a deterministic Playwright spec file.")
    .option("--out-dir <dir>", "Override the generated-tests output directory.")
    .action((opts) => safeRun(() => runTestGenerate({ outDir: opts.outDir })));
test.command("review")
    .description("Mark the generated test as reviewed (advances to phase test_reviewed).")
    .action(() => safeRun(() => runTestReview()));

// run
const run = program.command("run").description("Advance the workflow by one phase.");
run.command("next")
    .description("Run the engine-suggested next event (only valid for no-payload events).")
    .action(() => safeRun(() => runNext()));
run.command("phase <phase>")
    .description("Advance into a specific phase (e.g., `run phase test_executed`).")
    .action((targetPhase) => safeRun(async () => {
        if (targetPhase === "test_executed") {
            return runRunTestExecuted();
        }
        return runPhase({ targetPhase });
    }));

// failure
const failure = program.command("failure").description("Failure classification commands.");
failure.command("classify")
    .description("Classify the latest failing run; advances to phase failure_classified.")
    .action(() => safeRun(() => runFailureClassify()));

// repair
const repair = program.command("repair").description("Repair proposal lifecycle.");
repair.command("propose")
    .requiredOption("--proposal <path>", "Path to a repair-proposal YAML or JSON file.")
    .description("Validate and record a repair proposal; advances to repair_proposed.")
    .action((opts) => safeRun(() => runRepairPropose({ proposalPath: opts.proposal })));
repair.command("approve")
    .description("Approve the pending repair proposal; advances to repair_approved.")
    .action(() => safeRun(() => runRepairApprove()));
repair.command("apply")
    .description("Apply the approved repair (transactional, with backup); advances to repair_applied.")
    .action(() => safeRun(() => runRepairApply()));

// report
const report = program.command("report").description("Reports for the latest run.");
report.command("generate")
    .description("Generate Markdown and HTML reports; advances to report_generated.")
    .action(() => safeRun(() => runReportGenerate()));

// state
const state = program.command("state").description("Inspect workflow state.");
state.command("show")
    .description("Print the current phase, allowed next actions, and known artifacts.")
    .action(() => safeRun(() => runStateShow()));
state.command("validate")
    .description("Schema-validate state.json; exit non-zero if invalid.")
    .action(() => safeRun(() => runStateValidate()));

// agent (Copilot CLI adapter stubs)
const agent = program.command("agent").description("Copilot CLI adapter stubs (MVP: documented interface, not implemented).");
for (const sub of ["draft-plan", "generate-test", "explain-failure", "propose-repair"]) {
    agent.command(sub)
        .description(`Stub: see docs/copilot-cli-adapter.md`)
        .action(() => safeRun(() => runAgentStub(sub)));
}

await program.parseAsync(process.argv);
