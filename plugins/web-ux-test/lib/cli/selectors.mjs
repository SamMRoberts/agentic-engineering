/**
 * `web-ux-test selectors ...` — placeholder MVP advance.
 *
 * Future versions may scan a live page to suggest selectors. For now this command
 * simply confirms the user has reviewed selectors and advances the workflow.
 */

import { updateState } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";

export async function runSelectorsDiscover({ cwd = process.cwd() } = {}) {
    const next = await updateState((state) => {
        const r = transition(state, EVENTS.SELECTORS_DISCOVERED);
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return {
        ok: true,
        phase: next.phase,
        message: "Selectors discovery marked complete. Use `web-ux-test test generate` next."
    };
}
