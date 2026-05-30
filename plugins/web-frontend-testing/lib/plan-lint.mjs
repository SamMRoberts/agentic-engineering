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

    // Runner sanity (we expect playwright-mcp for this plugin).
    if (plan.runner && plan.runner !== "playwright-mcp") {
        warnings.push(`/runner is "${plan.runner}"; the web-frontend-testing plugin defaults to "playwright-mcp" — confirm the caller opted into another runner`);
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
