/**
 * `web-ux-test plan ...` commands.
 *
 * - validate <path>: schema-validate a plan YAML file.
 * - create <path>:   record a plan as "created" in workflow state.
 */

import fs from "node:fs";
import path from "node:path";

import { readYamlFile } from "../yaml-utils.mjs";
import { validateAgainstSchema } from "../schema-utils.mjs";
import { updateState } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";

export function validatePlanFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return { ok: false, errors: [`File not found: ${filePath}`] };
    }
    let plan;
    try {
        plan = readYamlFile(filePath);
    } catch (err) {
        return { ok: false, errors: [`Failed to parse YAML: ${err.message}`] };
    }
    const schemaErrors = validateAgainstSchema(plan, "test-plan.schema.yaml");
    if (schemaErrors.length > 0) {
        return { ok: false, errors: schemaErrors, plan };
    }
    return { ok: true, errors: [], plan };
}

export async function runPlanValidate({ planPath, cwd = process.cwd() } = {}) {
    const absolute = path.isAbsolute(planPath) ? planPath : path.resolve(cwd, planPath);
    const result = validatePlanFile(absolute);
    if (!result.ok) {
        return { ok: false, errors: result.errors };
    }
    // Best-effort state advance: only if a project is initialized.
    try {
        const next = await updateState((state) => {
            // Allow validate from plan_created (-> plan_validated) or from initialized (treat as create+validate)
            let s = state;
            if (s.phase === "initialized") {
                const created = transition(s, EVENTS.PLAN_CREATED, { planId: result.plan.id, planPath: absolute });
                if (!created.ok) throw created.error;
                s = created.state;
            }
            if (s.phase === "plan_created") {
                const validated = transition(s, EVENTS.PLAN_VALIDATED);
                if (!validated.ok) throw validated.error;
                s = validated.state;
            }
            return s;
        }, { cwd });
        return { ok: true, errors: [], plan: result.plan, planPath: absolute, phase: next.phase };
    } catch (err) {
        // No state to advance — still report validation success.
        return { ok: true, errors: [], plan: result.plan, planPath: absolute, phase: null, note: err.message };
    }
}

export async function runPlanCreate({ planPath, cwd = process.cwd() } = {}) {
    const absolute = path.isAbsolute(planPath) ? planPath : path.resolve(cwd, planPath);
    if (!fs.existsSync(absolute)) {
        return { ok: false, errors: [`File not found: ${absolute}`] };
    }
    let plan;
    try {
        plan = readYamlFile(absolute);
    } catch (err) {
        return { ok: false, errors: [`Failed to parse YAML: ${err.message}`] };
    }
    if (!plan?.id) {
        return { ok: false, errors: ["Plan is missing required field: id"] };
    }
    const next = await updateState((state) => {
        const result = transition(state, EVENTS.PLAN_CREATED, { planId: plan.id, planPath: absolute });
        if (!result.ok) throw result.error;
        return result.state;
    }, { cwd });
    return { ok: true, planPath: absolute, planId: plan.id, phase: next.phase };
}
