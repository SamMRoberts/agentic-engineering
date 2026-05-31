#!/usr/bin/env node
// Verify a Playwright storageState file is structurally valid and not expired,
// WITHOUT printing any secret values. Exit non-zero if missing/expired/empty.
// Usage: node verify-storage-state.mjs <storage-state.json> [--json]
import fs from "node:fs";

export function verifyStorageState(state, nowSeconds = Math.floor(Date.now() / 1000)) {
  const problems = [];
  const info = { cookies: 0, origins: 0, expiredCookies: 0, soonestExpiry: null };

  if (!state || typeof state !== "object") {
    return { ok: false, problems: ["file did not parse to an object"], info };
  }
  const cookies = Array.isArray(state.cookies) ? state.cookies : [];
  const origins = Array.isArray(state.origins) ? state.origins : [];
  info.cookies = cookies.length;
  info.origins = origins.length;

  if (cookies.length === 0 && origins.length === 0) {
    problems.push("storage state has no cookies or origins (not authenticated)");
  }

  for (const c of cookies) {
    if (typeof c.expires === "number" && c.expires > 0) {
      if (c.expires < nowSeconds) info.expiredCookies++;
      if (info.soonestExpiry == null || c.expires < info.soonestExpiry) info.soonestExpiry = c.expires;
    }
  }
  if (info.expiredCookies > 0) {
    problems.push(`${info.expiredCookies} cookie(s) already expired; re-save the storage state`);
  }

  return { ok: problems.length === 0, problems, info };
}

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("ERROR: usage: verify-storage-state.mjs <storage-state.json> [--json]");
    process.exit(2);
  }
  if (!fs.existsSync(file)) {
    console.error(`ERROR: storage state file not found: ${file}`);
    process.exit(1);
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error(`ERROR: could not parse ${file}: ${err.message}`);
    process.exit(1);
  }

  const result = verifyStorageState(state);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const p of result.problems) console.error(`ERROR: ${p}`);
    if (result.ok) {
      const expiry = result.info.soonestExpiry
        ? new Date(result.info.soonestExpiry * 1000).toISOString()
        : "no expiry recorded";
      console.log(`OK: ${result.info.cookies} cookie(s), ${result.info.origins} origin(s); soonest expiry ${expiry}`);
    }
  }
  process.exit(result.ok ? 0 : 1);
}

// Only run as CLI when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
