#!/usr/bin/env node
/**
 * Short-lived ops API sessions for agents working from a laptop.
 *
 *   ops-session.ts start --name <app> --api <url> --op-ref <op://…> [--ttl <seconds>]
 *   ops-session.ts call  --name <app> <path> [--method POST] [--data <json>]
 *   ops-session.ts status --name <app>
 *
 * `start` reads the long-lived token (it needs `ops:exchange`) from 1Password
 * with `op read` (one approval), trades it via `POST /ops/tokens/exchange` for
 * a token that expires in an hour (or `--ttl`), and saves only the short-lived
 * one to ~/.cache/saf-ops/<app>.json (0600). The long-lived token stays in
 * memory and is never written or printed.
 *
 * `call` sends one request with the saved token and prints the response body,
 * so an agent can use the session without ever seeing the token. It exits 2
 * when there's no session or it has expired.
 *
 * Products wire it up as npm scripts, e.g.:
 *   "ops-session": "node saflib/ops/ops-http/bin/ops-session.ts start --name casedaemon --api https://api.casedaemon.com --op-ref 'op://…'"
 *   "ops": "node saflib/ops/ops-http/bin/ops-session.ts call --name casedaemon"
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

export interface OpsSession {
  api: string;
  token: string;
  expires_at: string;
  scopes: string[];
}

export interface OpsSessionDeps {
  fetch: typeof fetch;
  readSecret: (ref: string) => Promise<string>;
  sessionDir: string;
  now: () => number;
  out: (line: string) => void;
}

const execFileAsync = promisify(execFile);

export const defaultDeps = (): OpsSessionDeps => ({
  fetch: globalThis.fetch,
  readSecret: async (ref) => {
    const { stdout } = await execFileAsync("op", ["read", "--no-newline", ref]);
    return stdout.trim();
  },
  sessionDir: path.join(homedir(), ".cache", "saf-ops"),
  now: Date.now,
  out: (line) => process.stdout.write(`${line}\n`),
});

export class OpsSessionError extends Error {
  // No parameter properties: Node runs this file with type stripping only.
  readonly exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function sessionFile(deps: OpsSessionDeps, name: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new OpsSessionError(`--name must be lowercase letters, digits and dashes: ${name}`);
  }
  return path.join(deps.sessionDir, `${name}.json`);
}

export async function startSession(
  deps: OpsSessionDeps,
  options: { name: string; api: string; opRef: string; ttlSeconds?: number },
): Promise<OpsSession> {
  const file = sessionFile(deps, options.name);
  const api = options.api.replace(/\/+$/, "");
  const longLived = await deps.readSecret(options.opRef);
  const response = await deps.fetch(`${api}/ops/tokens/exchange`, {
    method: "POST",
    headers: { authorization: `Bearer ${longLived}`, "content-type": "application/json" },
    body: JSON.stringify(options.ttlSeconds ? { expires_in_seconds: options.ttlSeconds } : {}),
  });
  if (response.status !== 201) {
    const hint =
      response.status === 403
        ? " (the stored token needs the ops:exchange scope)"
        : response.status === 401
          ? " (the stored token is invalid, expired, or revoked)"
          : "";
    throw new OpsSessionError(`Exchange failed: HTTP ${response.status}${hint}`);
  }
  const body = (await response.json()) as {
    token: string;
    ops_token: { expires_at: string; scopes: string[] };
  };
  const session: OpsSession = {
    api,
    token: body.token,
    expires_at: body.ops_token.expires_at,
    scopes: body.ops_token.scopes,
  };
  await mkdir(deps.sessionDir, { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify(session), { mode: 0o600 });
  await chmod(file, 0o600);
  deps.out(
    `ops session for ${options.name}: ${session.scopes.join(", ")}, until ${new Date(session.expires_at).toLocaleTimeString()}`,
  );
  return session;
}

export async function loadSession(deps: OpsSessionDeps, name: string): Promise<OpsSession> {
  const file = sessionFile(deps, name);
  let session: OpsSession;
  try {
    session = JSON.parse(await readFile(file, "utf8")) as OpsSession;
  } catch {
    throw new OpsSessionError(`No ops session for ${name}. Run: npm run ops-session`, 2);
  }
  if (Date.parse(session.expires_at) <= deps.now()) {
    await rm(file, { force: true });
    throw new OpsSessionError(`The ops session for ${name} expired. Run: npm run ops-session`, 2);
  }
  return session;
}

export async function callApi(
  deps: OpsSessionDeps,
  options: { name: string; path: string; method?: string; data?: string },
): Promise<number> {
  if (!options.path.startsWith("/ops/")) {
    throw new OpsSessionError(`Only /ops/ paths: ${options.path}`);
  }
  const session = await loadSession(deps, options.name);
  const method = (options.method ?? (options.data ? "POST" : "GET")).toUpperCase();
  const response = await deps.fetch(`${session.api}${options.path}`, {
    method,
    headers: {
      authorization: `Bearer ${session.token}`,
      ...(options.data !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(options.data !== undefined ? { body: options.data } : {}),
  });
  deps.out(await response.text());
  if (response.status === 401) {
    throw new OpsSessionError(`HTTP 401: the session was revoked or expired. Run: npm run ops-session`, 2);
  }
  if (response.status >= 400) {
    throw new OpsSessionError(`HTTP ${response.status}`);
  }
  return response.status;
}

export async function sessionStatus(deps: OpsSessionDeps, name: string): Promise<void> {
  const session = await loadSession(deps, name);
  const minutes = Math.round((Date.parse(session.expires_at) - deps.now()) / 60_000);
  deps.out(`${name}: ${session.scopes.join(", ")}, ${minutes} min left (${session.api})`);
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg.startsWith("--")) {
      const value = rest[i + 1];
      if (value === undefined) throw new OpsSessionError(`Missing value for ${arg}`);
      flags[arg.slice(2)] = value;
      i++;
    } else {
      positional.push(arg);
    }
  }
  return { command, flags, positional };
}

function required(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (!value) throw new OpsSessionError(`--${name} is required`);
  return value;
}

export async function main(argv: string[], deps: OpsSessionDeps = defaultDeps()): Promise<number> {
  const { command, flags, positional } = parseArgs(argv);
  switch (command) {
    case "start":
      await startSession(deps, {
        name: required(flags, "name"),
        api: required(flags, "api"),
        opRef: required(flags, "op-ref"),
        ttlSeconds: flags.ttl ? Number(flags.ttl) : undefined,
      });
      return 0;
    case "call": {
      const target = positional[0];
      if (!target) throw new OpsSessionError("call needs a path, e.g. /ops/digest");
      await callApi(deps, {
        name: required(flags, "name"),
        path: target,
        method: flags.method,
        data: flags.data,
      });
      return 0;
    }
    case "status":
      await sessionStatus(deps, required(flags, "name"));
      return 0;
    default:
      throw new OpsSessionError("Usage: ops-session.ts start|call|status --name <app> …");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(error instanceof OpsSessionError ? error.exitCode : 1);
    },
  );
}
