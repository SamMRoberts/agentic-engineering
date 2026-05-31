/**
 * Failure classifier rules. Order matters — first match wins.
 *
 * Each rule: { name, category, match: (ctx) => boolean }
 * ctx: { stdout, stderr, playwrightJson, runRecord }
 */

const has = (haystack, needle) => typeof haystack === "string" && haystack.length > 0 && haystack.toLowerCase().includes(needle.toLowerCase());

export const RULES = [
    {
        name: "auth_failure_401_403",
        category: "auth_failure",
        match: ({ stdout, stderr }) =>
            /\b(401|403)\b/.test(stdout) || /\b(401|403)\b/.test(stderr) ||
            has(stdout, "unauthorized") || has(stderr, "unauthorized") ||
            has(stdout, "forbidden") || has(stderr, "forbidden")
    },
    {
        name: "selector_not_found",
        category: "selector_not_found",
        match: ({ stdout, stderr }) =>
            has(stdout, "locator.click: timeout") && has(stdout, "waiting for") ||
            has(stdout, "no element matches") ||
            has(stderr, "no element matches") ||
            /strict mode violation: [^\n]+ resolved to 0 elements/i.test(stdout) ||
            /strict mode violation: [^\n]+ resolved to 0 elements/i.test(stderr) ||
            /no element found for selector/i.test(stdout) ||
            /no element found for selector/i.test(stderr)
    },
    {
        name: "timeout",
        category: "timeout",
        match: ({ stdout, stderr }) =>
            /test timeout of \d+ms exceeded/i.test(stdout) ||
            /test timeout of \d+ms exceeded/i.test(stderr) ||
            /timeout \d+ms exceeded while waiting/i.test(stdout) ||
            /timeout \d+ms exceeded while waiting/i.test(stderr)
    },
    {
        name: "navigation_failure",
        category: "navigation_failure",
        match: ({ stdout, stderr }) =>
            has(stdout, "page.goto:") && (has(stdout, "net::") || has(stdout, "navigation failed")) ||
            has(stderr, "page.goto:") && (has(stderr, "net::") || has(stderr, "navigation failed")) ||
            /net::ERR_(NAME_NOT_RESOLVED|CONNECTION_REFUSED|ABORTED|EMPTY_RESPONSE)/i.test(stdout) ||
            /net::ERR_(NAME_NOT_RESOLVED|CONNECTION_REFUSED|ABORTED|EMPTY_RESPONSE)/i.test(stderr)
    },
    {
        name: "network_failure",
        category: "network_failure",
        match: ({ stdout, stderr }) =>
            /\b(5\d{2})\b/.test(stdout) && (has(stdout, "request failed") || has(stdout, "response status")) ||
            /\b(5\d{2})\b/.test(stderr) && (has(stderr, "request failed") || has(stderr, "response status")) ||
            has(stdout, "econnreset") || has(stderr, "econnreset")
    },
    {
        name: "assertion_failure",
        category: "assertion_failure",
        match: ({ stdout, stderr }) =>
            has(stdout, "expect(") && has(stdout, "received") ||
            has(stdout, "expect(received)") ||
            has(stdout, "tobevisible") && has(stdout, "expected") ||
            has(stderr, "assertionerror")
    },
    {
        name: "application_error",
        category: "application_error",
        match: ({ stdout, stderr }) =>
            has(stdout, "uncaught exception") || has(stderr, "uncaught exception") ||
            has(stdout, "uncaught (in promise)") || has(stderr, "uncaught (in promise)") ||
            has(stdout, "page error:") || has(stderr, "page error:")
    }
];

export const UNKNOWN_CATEGORY = "unknown";
