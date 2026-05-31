/**
 * `web-ux-test run ...` commands.
 *
 * - run next:           dispatch to the engine-suggested next event.
 * - run phase <phase>:  attempt to transition into <phase> (gate-checked).
 *
 * Each event handler is registered here so the engine knows how to advance
 * without scattering business logic across many command files.
 */

import { readState, updateState } from "../state/store.mjs";
import { transition, suggestNextEvent } from "../workflow/engine.mjs";
import { EVENTS, PHASE_META, nextEventsFor } from "../workflow/phases.mjs";

/**
 * Dispatch table: event id -> async function ({ state, cwd, payload }) -> payload object.
 * Most events in MVP are advanced by their owning CLI command (plan validate, test generate, etc.).
 * `run next` invokes them only when no payload is needed.
 */
const NO_PAYLOAD_EVENTS = new Set([
    EVENTS.PLAN_VALIDATED,
    EVENTS.AUTH_CONFIGURED,
    EVENTS.SELECTORS_DISCOVERED,
    EVENTS.TEST_REVIEWED,
    EVENTS.REPORT_GENERATED
]);

export async function runNext({ cwd = process.cwd() } = {}) {
    const current = readState(cwd);
    const event = suggestNextEvent(current);
    if (!event) {
        return {
            ok: false,
            errors: [`No legal next event from phase "${current.phase}" (terminal or ambiguous).`],
            phase: current.phase
        };
    }
    if (!NO_PAYLOAD_EVENTS.has(event)) {
        const meta = PHASE_META[current.phase];
        return {
            ok: false,
            errors: [
                `Phase "${current.phase}" requires explicit input to advance via event "${event}".`,
                `Use the matching command instead: ${meta?.nextHint ?? "(see docs/workflow.md)"}.`
            ],
            phase: current.phase,
            requiredEvent: event
        };
    }
    const next = await updateState((state) => {
        const r = transition(state, event);
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return { ok: true, fromPhase: current.phase, toPhase: next.phase, event };
}

export async function runPhase({ targetPhase, cwd = process.cwd() } = {}) {
    const current = readState(cwd);
    const events = nextEventsFor(current.phase);
    // Translate a target phase into the matching event (if exactly one matches).
    const matching = events.filter((evt) => {
        const transitionsMap = (PHASE_META[current.phase]?.allowedCommands ?? []);
        // We don't store phase target per event, but TRANSITIONS does — re-check via transition().
        const probe = transition(current, evt);
        return probe.ok && probe.state.phase === targetPhase;
    });
    if (matching.length === 0) {
        return {
            ok: false,
            errors: [
                `Cannot reach phase "${targetPhase}" from current phase "${current.phase}".`,
                `Allowed events from here: ${events.join(", ") || "(none)"}.`
            ],
            phase: current.phase
        };
    }
    if (matching.length > 1) {
        return {
            ok: false,
            errors: [
                `Multiple events from "${current.phase}" lead to "${targetPhase}" (${matching.join(", ")}). Specify the event explicitly.`
            ]
        };
    }
    const event = matching[0];
    if (!NO_PAYLOAD_EVENTS.has(event)) {
        return {
            ok: false,
            errors: [
                `Event "${event}" requires explicit input. Use the matching command (e.g., plan validate, test generate, repair propose) instead of \`run phase\`.`
            ]
        };
    }
    const next = await updateState((state) => {
        const r = transition(state, event);
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return { ok: true, fromPhase: current.phase, toPhase: next.phase, event };
}
