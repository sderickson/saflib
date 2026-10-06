import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { BuildSecretSource } from "./builds.ts";

/** Value of `key` in a `KEY=value` file (comments skipped, quotes stripped). */
function readEnvFileValue(file: string, key: string): string | undefined {
  if (!existsSync(file)) return undefined;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match?.[1] !== key) continue;
    const value = match[2].trim();
    return /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return undefined;
}

/**
 * Resolves a build's secrets: the environment variable first, else its
 * `envFile` (relative to `contextDir`). Throws naming any that are missing.
 */
export function resolveBuildSecrets(
  secrets: Record<string, BuildSecretSource>,
  contextDir: string,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  for (const [id, source] of Object.entries(secrets)) {
    const value =
      env[source.env] ||
      (source.envFile
        ? readEnvFileValue(path.join(contextDir, source.envFile), source.env)
        : undefined);
    if (value) values[id] = value;
    else {
      missing.push(
        `${id} (set ${source.env}${source.envFile ? ` or add it to ${source.envFile}` : ""})`,
      );
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing build secret(s): ${missing.join("; ")}`);
  }
  return values;
}
