/**
 * Atomic JSON state store for .web-ux-testing/state.json.
 *
 * - Schema-validates on every read and write.
 * - Atomic temp-file rename for write.
 * - Optimistic file-lock at .web-ux-testing/state.lock with timeout + stale-lock recovery.
 * - This module is the *only* place that touches state.json.
 */

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { createInitialState } from "../workflow/engine.mjs";
import { validateAgainstSchema } from "../schema-utils.mjs";

const STATE_FILE = "state.json";
const LOCK_FILE = "state.lock";
const PROJECT_DIR = ".web-ux-testing";
const DEFAULT_LOCK_TIMEOUT_MS = 5000;
const DEFAULT_LOCK_POLL_MS = 25;
const STALE_LOCK_AGE_MS = 30_000;

export class StateError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "StateError";
        this.code = code;
    }
}

export const STATE_ERRORS = Object.freeze({
    NOT_INITIALIZED: "not_initialized",
    INVALID_STATE: "invalid_state",
    LOCK_TIMEOUT: "lock_timeout",
    IO: "io"
});

export function projectDir(cwd = process.cwd()) {
    return path.resolve(cwd, PROJECT_DIR);
}

export function statePath(cwd = process.cwd()) {
    return path.join(projectDir(cwd), STATE_FILE);
}

export function lockPath(cwd = process.cwd()) {
    return path.join(projectDir(cwd), LOCK_FILE);
}

export function isInitialized(cwd = process.cwd()) {
    return fs.existsSync(statePath(cwd));
}

export function ensureProjectDir(cwd = process.cwd()) {
    fs.mkdirSync(projectDir(cwd), { recursive: true });
}

function assertValid(state) {
    const errors = validateAgainstSchema(state, "workflow-state.schema.yaml");
    if (errors.length > 0) {
        throw new StateError(STATE_ERRORS.INVALID_STATE, `state.json failed validation: ${errors.join("; ")}`);
    }
}

export function readState(cwd = process.cwd()) {
    const file = statePath(cwd);
    if (!fs.existsSync(file)) {
        throw new StateError(STATE_ERRORS.NOT_INITIALIZED, `No state.json found at ${file}. Run "web-ux-test init" first.`);
    }
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
        throw new StateError(STATE_ERRORS.IO, `Failed to read or parse ${file}: ${err.message}`);
    }
    assertValid(parsed);
    return parsed;
}

async function acquireLock(cwd, timeoutMs) {
    ensureProjectDir(cwd);
    const lock = lockPath(cwd);
    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const fd = await fsPromises.open(lock, "wx");
            await fd.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
            await fd.close();
            return;
        } catch (err) {
            if (err.code !== "EEXIST") {
                throw new StateError(STATE_ERRORS.IO, `Failed to acquire state lock: ${err.message}`);
            }
            // Stale lock recovery.
            try {
                const stat = await fsPromises.stat(lock);
                if (Date.now() - stat.mtimeMs > STALE_LOCK_AGE_MS) {
                    await fsPromises.unlink(lock).catch(() => { });
                    continue;
                }
            } catch {
                // race: lock disappeared, retry
                continue;
            }
            if (Date.now() - start > timeoutMs) {
                throw new StateError(STATE_ERRORS.LOCK_TIMEOUT, `Timed out (${timeoutMs}ms) waiting for state lock ${lock}.`);
            }
            await delay(DEFAULT_LOCK_POLL_MS);
        }
    }
}

async function releaseLock(cwd) {
    await fsPromises.unlink(lockPath(cwd)).catch(() => { });
}

async function atomicWrite(file, contents) {
    const dir = path.dirname(file);
    await fsPromises.mkdir(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fsPromises.writeFile(tmp, contents);
    await fsPromises.rename(tmp, file);
}

/**
 * Write state atomically with schema validation and file-lock.
 */
export async function writeState(state, { cwd = process.cwd(), timeoutMs = DEFAULT_LOCK_TIMEOUT_MS } = {}) {
    assertValid(state);
    await acquireLock(cwd, timeoutMs);
    try {
        await atomicWrite(statePath(cwd), JSON.stringify(state, null, 2) + "\n");
    } finally {
        await releaseLock(cwd);
    }
    return state;
}

/**
 * Read-modify-write helper. Holds the lock for the duration of `mutator`.
 * `mutator` is sync: (state) => nextState. For async mutators, acquire and release manually.
 */
export async function updateState(mutator, { cwd = process.cwd(), timeoutMs = DEFAULT_LOCK_TIMEOUT_MS } = {}) {
    await acquireLock(cwd, timeoutMs);
    try {
        const current = readState(cwd);
        const next = mutator(current);
        assertValid(next);
        await atomicWrite(statePath(cwd), JSON.stringify(next, null, 2) + "\n");
        return next;
    } finally {
        await releaseLock(cwd);
    }
}

/**
 * Initialize a fresh state.json (idempotent: errors if state already exists).
 */
export async function initState({ cwd = process.cwd() } = {}) {
    if (isInitialized(cwd)) {
        throw new StateError(STATE_ERRORS.IO, `Project already initialized at ${statePath(cwd)}.`);
    }
    const initial = createInitialState();
    return writeState(initial, { cwd });
}
