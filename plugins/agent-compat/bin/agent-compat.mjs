#!/usr/bin/env node

import { Command } from "commander";

import { generate, install, scan, validate } from "../lib/workflow.mjs";

function printWarnings(warnings) {
    for (const warning of warnings) {
        console.error(`WARN: ${warning}`);
    }
}

function printErrors(errors) {
    for (const error of errors) {
        console.error(`ERROR: ${error}`);
    }
}

function summarizeAgents(agents) {
    console.log(`Discovered ${agents.length} agent(s):`);
    for (const agent of agents) {
        console.log(`  - ${agent.name ?? "(missing name)"} (${agent.relativePath})`);
    }
}

function handleFailure(err) {
    console.error(`ERROR: ${err.message}`);
    process.exitCode = 2;
}

const program = new Command();

program
    .name("agent-compat")
    .description("Convert Copilot *.agent.md custom agents into Codex and Claude instruction overlays.")
    .version("0.2.0");

program
    .command("scan")
    .description("Discover Copilot *.agent.md custom agents.")
    .option("--root <path>", "repository root", process.cwd())
    .option("--json", "print JSON")
    .action((options) => {
        try {
            const agents = scan({ root: options.root });
            if (options.json) {
                console.log(JSON.stringify({ agents }, null, 2));
                return;
            }
            summarizeAgents(agents);
        } catch (err) {
            handleFailure(err);
        }
    });

program
    .command("validate")
    .description("Validate discovered custom agents for Codex/Claude compatibility.")
    .option("--root <path>", "repository root", process.cwd())
    .action((options) => {
        try {
            const result = validate({ root: options.root });
            summarizeAgents(result.agents);
            printWarnings(result.validation.warnings);
            printErrors(result.validation.errors);
            if (!result.validation.ok) {
                process.exitCode = 1;
                return;
            }
            console.log("Validation passed.");
        } catch (err) {
            handleFailure(err);
        }
    });

program
    .command("generate")
    .description("Generate standalone Codex and/or Claude compatibility overlays.")
    .option("--root <path>", "repository root", process.cwd())
    .option("--target <target>", "codex, claude, or all", "all")
    .option("--out <dir>", "output directory")
    .action((options) => {
        try {
            const result = generate({ root: options.root, target: options.target, outDir: options.out });
            printWarnings(result.validation.warnings);
            printErrors(result.validation.errors);
            if (!result.ok) {
                process.exitCode = 1;
                return;
            }
            for (const output of result.outputs) {
                console.log(`Wrote ${output.target}: ${output.filePath}`);
                console.log(`Wrote ${output.references.length} ${output.target} reference file(s).`);
            }
        } catch (err) {
            handleFailure(err);
        }
    });

program
    .command("install")
    .description("Install generated overlays into managed sections of host instruction files.")
    .option("--root <path>", "repository root", process.cwd())
    .option("--target <target>", "codex, claude, or all", "all")
    .option("--codex-file <path>", "Codex instruction file path relative to root", "AGENTS.md")
    .option("--claude-file <path>", "Claude instruction file path relative to root", "custom-instructions.md")
    .action((options) => {
        try {
            const result = install({
                root: options.root,
                target: options.target,
                codexFile: options.codexFile,
                claudeFile: options.claudeFile
            });
            printWarnings(result.validation.warnings);
            printErrors(result.validation.errors);
            if (!result.ok) {
                process.exitCode = 1;
                return;
            }
            for (const output of result.outputs) {
                const state = output.changed ? "Updated" : "Unchanged";
                console.log(`${state} ${output.target}: ${output.filePath}`);
                console.log(`Wrote ${output.references.length} ${output.target} reference file(s).`);
            }
        } catch (err) {
            handleFailure(err);
        }
    });

program.parse(process.argv);
