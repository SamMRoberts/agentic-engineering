// Auth resolution for the runner. Produces the Playwright context options needed
// to satisfy a plan's auth strategy WITHOUT ever embedding credentials. Secrets
// are only ever read from environment variables at runtime.
import fs from "node:fs";
import type { Environment } from "./types.js";

export interface ResolvedAuth {
  storageState?: string;
  /** Names (not values) of env vars the plan expects to exist. */
  requiredEnv: string[];
  /** Human-readable problems that should block or warn before running. */
  problems: string[];
}

/** Resolve auth for an environment without reading secret values into the report. */
export function resolveAuth(env: Environment): ResolvedAuth {
  const auth = env.auth;
  const result: ResolvedAuth = { requiredEnv: [], problems: [] };
  if (!auth || auth.strategy === "none" || !auth.required) return result;

  switch (auth.strategy) {
    case "storage_state": {
      if (!auth.storage_state_path) {
        result.problems.push("auth.strategy is storage_state but storage_state_path is missing");
        break;
      }
      if (!fs.existsSync(auth.storage_state_path)) {
        result.problems.push(
          `storage state file not found at ${auth.storage_state_path}; run save-storage-state first`
        );
      }
      result.storageState = auth.storage_state_path;
      break;
    }
    case "env_credentials": {
      const creds: Array<[string, string | undefined]> = [
        ["username", auth.username_env],
        ["password", auth.password_env]
      ];
      for (const [label, key] of creds) {
        if (!key) {
          result.problems.push("env_credentials requires username_env and password_env to be named");
          continue;
        }
        result.requiredEnv.push(key);
        if (process.env[key] == null) {
          // Reference the credential role, not the configured env var name, so
          // no potentially sensitive identifier is surfaced in logs/reports.
          result.problems.push(`required ${label} environment variable is not set`);
        }
      }
      break;
    }
    case "manual_login_pause":
      // Nothing to resolve ahead of time; the runner pauses for a human.
      break;
    case "secret_manager":
      result.problems.push(
        "secret_manager strategy requires an out-of-band fetch step; configure it before running"
      );
      break;
    default:
      break;
  }
  return result;
}
