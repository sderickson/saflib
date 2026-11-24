import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseEnvFile, targetEnvFile } from "../config.ts";

const ASSIGNMENT = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)=.*$/;

/**
 * Sets `KEY=value` lines in env-file text, keeping comments, order and every
 * other line: an existing assignment is replaced in place (its first
 * occurrence; later duplicates are dropped), a new key is appended.
 */
export function setEnvValues(
  contents: string,
  values: Record<string, string>,
): string {
  const remaining = new Map(Object.entries(values));
  const seen = new Set<string>();
  const lines = contents.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const match = line.match(ASSIGNMENT);
    if (match && values[match[2]] !== undefined) {
      const key = match[2];
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`${match[1]}${key}=${formatValue(values[key])}`);
      remaining.delete(key);
      continue;
    }
    out.push(line);
  }
  if (remaining.size > 0) {
    while (out.length > 0 && out[out.length - 1] === "") out.pop();
    for (const [key, value] of remaining) {
      out.push(`${key}=${formatValue(value)}`);
    }
    out.push("");
  }
  return out.join("\n");
}

function formatValue(value: string): string {
  return /^[A-Za-z0-9_@./:,+=-]*$/.test(value)
    ? value
    : `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

/** The text of a new `env.remote.<target>` overrides file. */
export function targetEnvContents(
  target: string,
  values: Record<string, string>,
): string {
  return setEnvValues(
    `# Overrides for the "${target}" deploy target: layered over env.remote by\n` +
      `# saf-deploy --target ${target} (or SAF_DEPLOY_TARGET=${target}).\n`,
    values,
  );
}

/** Writes or updates `env.remote.<target>` with `values`. */
export function writeTargetEnv(
  deployDir: string,
  target: string,
  values: Record<string, string>,
): string {
  const file = targetEnvFile(deployDir, target);
  const contents = existsSync(file)
    ? setEnvValues(readFileSync(file, "utf8"), values)
    : targetEnvContents(target, values);
  writeFileSync(file, contents);
  return file;
}

export interface PromotePlan {
  /** New `env.remote` text: the target's overrides merged in. */
  envRemote: string;
  /** `env.remote.<previousName>`: the values the overrides replaced. */
  previous: string;
}

/**
 * Plans promoting `target` to the default: its overrides merge into
 * `env.remote`, and the values they replace move to an
 * `env.remote.<previousName>` overrides file (so the old host stays
 * addressable as a target, e.g. for a rollback).
 */
export function planPromote(
  envRemote: string,
  targetOverrides: string,
  previousName: string,
): PromotePlan {
  const base = parseEnvFile(envRemote);
  const overrides = parseEnvFile(targetOverrides);
  const replaced: Record<string, string> = {};
  for (const key of Object.keys(overrides)) {
    // A key the base didn't have can't be restored by an override file;
    // an empty value is the closest "unset" env.remote supports.
    replaced[key] = base[key] ?? "";
  }
  return {
    envRemote: setEnvValues(envRemote, overrides),
    previous: targetEnvContents(previousName, replaced),
  };
}

/** Applies {@link planPromote} to a deploy package's files. */
export function promoteTarget(
  deployDir: string,
  target: string,
  previousName: string,
): void {
  const envFile = path.join(deployDir, "env.remote");
  const targetFile = targetEnvFile(deployDir, target);
  const plan = planPromote(
    readFileSync(envFile, "utf8"),
    readFileSync(targetFile, "utf8"),
    previousName,
  );
  writeFileSync(targetEnvFile(deployDir, previousName), plan.previous);
  writeFileSync(envFile, plan.envRemote);
  rmSync(targetFile);
}
