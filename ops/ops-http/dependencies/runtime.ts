import { existsSync, readFileSync } from "node:fs";

/** The container's OS release, from /etc/os-release. */
export interface OsRelease {
  /** `ID`: debian, alpine, ubuntu, … */
  id: string;
  /** `VERSION_ID`: 12, 3.22.1, 24.04, … */
  versionId: string;
}

/** A runtime pin that ages out on its own (no lockfile entry, no Renovate PR in the image). */
export interface RuntimeComponent {
  /** `image`: Node and the container's base OS; `host`: the server's OS. */
  scope: "image" | "host";
  /** endoflife.date product: nodejs, debian, alpine-linux, ubuntu. */
  name: string;
  version: string;
  /** Release line: Node's major, Debian's major, Alpine's major.minor. */
  cycle: string;
  /** End of security support (YYYY-MM-DD), or null if unknown or not announced. */
  eol: string | null;
  /** EOL is past or within `RUNTIME_EOL_WARNING_DAYS`. */
  eol_soon: boolean;
  /** Newest release in this cycle, if known. */
  latest_in_cycle: string | null;
}

/** How far ahead an EOL counts as soon: enough time to plan a Node major or base-image move. */
export const RUNTIME_EOL_WARNING_DAYS = 90;

/** Parse /etc/os-release content (KEY=value or KEY="value" lines). */
export function parseOsRelease(raw: string): OsRelease | null {
  const fields: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) fields[m[1]!] = m[2]!.replace(/^"(.*)"$/, "$1");
  }
  return fields.ID && fields.VERSION_ID ? { id: fields.ID, versionId: fields.VERSION_ID } : null;
}

export function readOsRelease(path = "/etc/os-release"): OsRelease | null {
  if (!existsSync(path)) return null;
  return parseOsRelease(readFileSync(path, "utf8"));
}

/** Which endoflife.date product and cycle a runtime belongs to; undefined if untracked. */
type RuntimeCycle = { scope: RuntimeComponent["scope"]; name: string; version: string; cycle: string };

/** An OS release's endoflife.date product and cycle; undefined if untracked. */
function osCycle(os: OsRelease): { name: string; version: string; cycle: string } | undefined {
  const v = os.versionId;
  if (os.id === "debian") return { name: "debian", version: v, cycle: v.split(".")[0]! };
  if (os.id === "alpine") return { name: "alpine-linux", version: v, cycle: v.split(".").slice(0, 2).join(".") };
  if (os.id === "ubuntu") return { name: "ubuntu", version: v, cycle: v };
  return undefined;
}

/** Which endoflife.date product and cycle each runtime belongs to. */
export function runtimeCycles(
  nodeVersion: string,
  os: OsRelease | null,
  hostOs: OsRelease | null = null,
): RuntimeCycle[] {
  const out: RuntimeCycle[] = [];
  const node = nodeVersion.replace(/^v/, "");
  out.push({ scope: "image", name: "nodejs", version: node, cycle: node.split(".")[0]! });
  const image = os && osCycle(os);
  if (image) out.push({ scope: "image", ...image });
  const host = hostOs && osCycle(hostOs);
  if (host) out.push({ scope: "host", ...host });
  return out;
}

interface EolCycle {
  cycle: string;
  /** A date, or false while unannounced. */
  eol?: string | boolean;
  latest?: string;
}

/**
 * Look up each runtime's end of life on endoflife.date. Failed lookups go in
 * `errors`; the component is still listed with an unknown EOL.
 */
export async function checkRuntime(
  nodeVersion: string,
  os: OsRelease | null,
  options: {
    fetch: typeof fetch;
    now: Date;
    url: string;
    signal: () => AbortSignal;
    errors: string[];
    /** The server's OS (from Prometheus' node_os_info), when known. */
    hostOs?: OsRelease | null;
  },
): Promise<RuntimeComponent[]> {
  return Promise.all(
    runtimeCycles(nodeVersion, os, options.hostOs ?? null).map(async ({ scope, name, version, cycle }) => {
      const component: RuntimeComponent = { scope, name, version, cycle, eol: null, eol_soon: false, latest_in_cycle: null };
      try {
        const res = await options.fetch(`${options.url}/api/${name}.json`, { signal: options.signal() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const entry = ((await res.json()) as EolCycle[]).find((c) => String(c.cycle) === cycle);
        if (!entry) throw new Error(`no cycle ${cycle}`);
        if (typeof entry.eol === "string") component.eol = entry.eol;
        // `eol: true` means ended with no date given.
        component.eol_soon =
          entry.eol === true ||
          (typeof entry.eol === "string" &&
            Date.parse(entry.eol) - options.now.getTime() < RUNTIME_EOL_WARNING_DAYS * 86_400_000);
        component.latest_in_cycle = entry.latest ?? null;
      } catch (e) {
        options.errors.push(`endoflife ${scope} ${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
      return component;
    }),
  );
}
