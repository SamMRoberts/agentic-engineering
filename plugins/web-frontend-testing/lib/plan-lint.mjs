import { walk } from "./yaml-utils.mjs";

// Patterns that look like leaked credentials. Conservative on purpose:
// they are checked against every string scalar inside the plan.
const CREDENTIAL_PATTERNS = [
    { name: "JWT", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
    { name: "GitHub PAT", regex: /\bghp_[A-Za-z0-9]{20,}\b/ },
    { name: "OpenAI key", regex: /\bsk-[A-Za-z0-9]{20,}\b/ },
    { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "Slack token", regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
    { name: "Password literal", regex: /(?:^|[^A-Za-z0-9_])password\s*[:=]\s*["'`][^"'`\s]{4,}/i },
    { name: "Authorization header", regex: /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{10,}/i }
];

const FIRST_PASS_SCENARIO_CAP = 10;
const ENV_VAR_REFERENCE = /\$\{?[A-Z][A-Z0-9_]*\}?/; // e.g., $TOKEN, ${TOKEN}

const CLI_RUNNERS = new Set(["playwright-cli", "hybrid"]);

function hasCliTarget(scenario) {
    if (!scenario || typeof scenario !== "object") return false;
    if (typeof scenario.test_file === "string" && scenario.test_file.trim().length > 0) return true;
    if (typeof scenario.test_command === "string" && scenario.test_command.trim().length > 0) return true;
    if (Array.isArray(scenario.executable_steps) && scenario.executable_steps.length > 0) return true;
    return false;
}

function authStrategyAllowsManualPreTest(strategy) {
    // Manual pre-test auth only makes sense when the test does not have
    // baked-in credentials or a programmatic seed it will overwrite.
    return strategy === "storage_state" || strategy === "shared" || strategy === "none";
}

export function lintPlan(plan) {
    const errors = [];
    const warnings = [];

    if (!plan || typeof plan !== "object") {
        return { errors: ["root must be a YAML object"], warnings };
    }

    // Unique scenario ids.
    const scenarios = Array.isArray(plan.scenarios) ? plan.scenarios : [];
    const seen = new Map();
    for (let i = 0; i < scenarios.length; i++) {
        const sc = scenarios[i];
        const id = sc?.id;
        if (typeof id !== "string") continue;
        if (seen.has(id)) {
            errors.push(`/scenarios/${i}/id duplicate scenario id "${id}" (first seen at /scenarios/${seen.get(id)})`);
        } else {
            seen.set(id, i);
        }
    }

    // Per-scenario invariants beyond the schema.
    scenarios.forEach((sc, i) => {
        if (!sc || typeof sc !== "object") return;
        const base = `/scenarios/${i}`;

        const hasExpect = Array.isArray(sc.steps)
            && sc.steps.some((s) => typeof s?.expect === "string" && s.expect.trim().length > 0);
        if (!hasExpect) {
            errors.push(`${base} must contain at least one step with a non-empty expect`);
        }

        if (Array.isArray(sc.evidence_required) && sc.evidence_required.length === 0) {
            errors.push(`${base}/evidence_required must contain at least one entry`);
        }

        // Destructive scenarios should be P1.
        const surface = sc.surface;
        const looksDestructive = surface === "form" && /delete|remove|pay|purchase|charge|transfer|wipe|send/i.test(sc.title ?? "");
        if (looksDestructive && sc.priority !== "P1") {
            warnings.push(`${base} appears destructive but is not P1 (title: "${sc.title}")`);
        }
    });

    if (scenarios.length > FIRST_PASS_SCENARIO_CAP) {
        warnings.push(`/scenarios length ${scenarios.length} exceeds first-pass cap of ${FIRST_PASS_SCENARIO_CAP}; confirm the caller approved a larger plan`);
    }

    // Production stage cannot allow destructive actions.
    const stage = plan.target?.stage;
    if (stage === "production" && plan.safety?.destructive_actions_allowed === true) {
        errors.push(`/safety/destructive_actions_allowed must be false when target.stage is "production"`);
    }

    // Runner-specific rules.
    const runner = plan.runner;
    const planCliSession = plan.cli_session;
    const planCliCommand = typeof planCliSession?.test_command === "string" && planCliSession.test_command.trim().length > 0;
    const planCliDir = typeof planCliSession?.test_dir === "string" && planCliSession.test_dir.trim().length > 0;
    const cliScenarios = scenarios.filter(hasCliTarget);

    if (CLI_RUNNERS.has(runner)) {
        if (!planCliCommand && !planCliDir && cliScenarios.length === 0) {
            errors.push(
                `/runner is "${runner}" but no deterministic CLI target exists: set cli_session.test_command, cli_session.test_dir, or add scenarios with test_file/test_command/executable_steps`
            );
        }

        scenarios.forEach((sc, i) => {
            if (!sc || typeof sc !== "object") return;
            const base = `/scenarios/${i}`;
            if (Array.isArray(sc.executable_steps) && sc.executable_steps.length > 0
                && sc.convert_to_regression_test !== true) {
                warnings.push(
                    `${base} has executable_steps but convert_to_regression_test is not true; the generator will skip it`
                );
            }

            const auth = plan.target?.auth_strategy;
            const scenarioAuth = sc.pre_test_auth_session;
            const planAuth = planCliSession?.pre_test_auth_session;
            const effectiveAuth = scenarioAuth ?? planAuth;
            if (effectiveAuth?.enabled === true) {
                if (!authStrategyAllowsManualPreTest(auth)) {
                    errors.push(
                        `${base}/pre_test_auth_session.enabled is true but target.auth_strategy "${auth}" is incompatible (use none, shared, or storage_state)`
                    );
                }
                const readySignal = effectiveAuth.ready_signal;
                if (readySignal === "storage_state_written"
                    && !(effectiveAuth.storage_state_path || planAuth?.storage_state_path)) {
                    errors.push(
                        `${base}/pre_test_auth_session.ready_signal is "storage_state_written" but no storage_state_path is provided`
                    );
                }
                if (readySignal === "exit_code"
                    && !(effectiveAuth.command || planAuth?.command)) {
                    errors.push(
                        `${base}/pre_test_auth_session.ready_signal is "exit_code" but no command is provided`
                    );
                }
            }
        });

        if (runner === "hybrid") {
            const hasMcpSteps = scenarios.some((sc) => Array.isArray(sc?.steps) && sc.steps.length > 0);
            const hasCli = cliScenarios.length > 0 || planCliCommand || planCliDir;
            if (!hasMcpSteps || !hasCli) {
                errors.push(
                    `/runner is "hybrid" but the plan does not contain both MCP discovery steps and a CLI regression target`
                );
            }
        }
    } else if (runner && runner !== "playwright-mcp") {
        // The schema catches unknown enum values; this branch only hits when
        // a future runner is added without updating the lint.
        warnings.push(`/runner is "${runner}"; CLI-specific checks were skipped`);
    } else {
        // playwright-mcp plan: CLI fields are optional, but surface a warning
        // if the user wrote CLI-only metadata that this runner ignores.
        if (cliScenarios.length > 0 || planCliCommand || planCliDir) {
            warnings.push(
                `/cli_session or scenario CLI metadata is present but runner is "playwright-mcp"; set runner to "playwright-cli" or "hybrid" to use it`
            );
        }
    }

    // Forbidden_urls should be populated for production.
    if (stage === "production"
        && Array.isArray(plan.safety?.forbidden_urls)
        && plan.safety.forbidden_urls.length === 0) {
        warnings.push(`/safety/forbidden_urls is empty for a production target; consider listing hosts outside the target`);
    }

    // Credential scan across every string scalar in the plan.
    walk(plan, (value, p) => {
        if (typeof value !== "string") return;
        if (ENV_VAR_REFERENCE.test(value)) return; // ${TOKEN} style refs are fine
        for (const { name, regex } of CREDENTIAL_PATTERNS) {
            if (regex.test(value)) {
                errors.push(`/${p.join("/")} appears to contain a ${name} literal; reference secrets by env var or storage-state path instead`);
                break;
            }
        }
    });

    return { errors, warnings };
}

// Exported so the generator can iterate scenarios without re-walking the plan.
export function collectScenarios(plan) {
    return Array.isArray(plan?.scenarios) ? plan.scenarios.map((scenario) => ({ scenario })) : [];
}

