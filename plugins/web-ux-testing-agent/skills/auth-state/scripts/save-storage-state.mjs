#!/usr/bin/env node
// Save a Playwright storageState by opening a browser for manual login, then
// writing the authenticated session to a gitignored JSON file. Never prints or
// stores credentials. Requires @playwright/test to be installed in runner/.
// Usage: node save-storage-state.mjs --url <login-url> --out <path> [--timeout <ms>]
import path from "node:path";

function getArg(args, name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

async function main(argv) {
  const args = argv.slice(2);
  const url = getArg(args, "--url");
  const out = getArg(args, "--out", ".auth/storage-state.json");
  const timeout = Number(getArg(args, "--timeout", "180000"));
  if (!url) {
    console.error("ERROR: usage: save-storage-state.mjs --url <login-url> --out <path> [--timeout <ms>]");
    process.exit(2);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "ERROR: Playwright is not installed. Run `npm --prefix runner install` first, then `npx playwright install chromium`."
    );
    process.exit(3);
  }

  console.error(`Opening ${url}. Log in manually in the browser window.`);
  console.error("The session is saved automatically once the page reaches an authenticated state.");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);

  console.error(`Waiting up to ${Math.round(timeout / 1000)}s for you to finish logging in...`);
  // Wait for the login form to disappear or navigation away from the login URL.
  try {
    await page.waitForURL((u) => !String(u).includes("login") && !String(u).includes("signin"), {
      timeout
    });
  } catch {
    console.error("WARN: did not detect navigation away from the login page; saving current state anyway.");
  }

  const fs = await import("node:fs");
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await context.storageState({ path: out });
  await browser.close();
  console.log(`OK: saved storage state to ${out} (add it to .gitignore; do not commit it)`);
}

main(process.argv).catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
