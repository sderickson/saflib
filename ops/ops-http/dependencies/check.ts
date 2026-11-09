import type { DependencyManifest } from "./manifest.ts";
import { compareVersions, updateKind } from "./semver.ts";

export type AdvisorySeverity = "critical" | "high" | "moderate" | "low" | "unknown";

export interface DependencyAdvisory {
  id: string;
  aliases: string[];
  severity: AdvisorySeverity;
  package: string;
  deployed: string;
  /** Lowest fixed version above the deployed one, if any. */
  fixed_in: string | null;
  direct: boolean;
  /** High or critical: worth acting on now. */
  actionable: boolean;
  /** From OSV: outside text. */
  summary: string;
}

export interface OutdatedDependency {
  name: string;
  deployed: string;
  latest: string;
  latest_published_at: string | null;
  update: "major" | "minor" | "patch";
  /** The latest release is past the minimum release age, so Renovate should have a PR open. */
  renovate_due: boolean;
}

export interface DependencyReport {
  checked_at: string;
  packages_total: number;
  direct_total: number;
  node_version: string;
  lockfile_hash: string;
  advisories: DependencyAdvisory[];
  outdated: OutdatedDependency[];
  /** Lookups that failed (the rest of the report still stands). */
  errors: string[];
}

export interface CheckOptions {
  fetch?: typeof fetch;
  now?: Date;
  /** Renovate's minimumReleaseAge (default 3 days). */
  minimumReleaseAgeMs?: number;
  osvUrl?: string;
  registryUrl?: string;
  timeoutMs?: number;
}

const SEVERITY_ORDER: AdvisorySeverity[] = ["critical", "high", "moderate", "low", "unknown"];

function normalizeSeverity(raw: unknown): AdvisorySeverity {
  const s = String(raw ?? "").toLowerCase();
  if (s === "critical" || s === "high" || s === "low") return s;
  if (s === "moderate" || s === "medium") return "moderate";
  return "unknown";
}

interface OsvVuln {
  id: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  database_specific?: { severity?: string };
  affected?: {
    package?: { name?: string; ecosystem?: string };
    ranges?: { events?: { introduced?: string; fixed?: string }[] }[];
  }[];
}

/** Run `fn` over `items`, at most `limit` at a time. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

/**
 * Check a manifest against OSV.dev (advisories for every installed package)
 * and the npm registry (latest version of each direct dependency). Never
 * throws; failed lookups are listed in `errors`.
 */
export async function checkDependencies(
  manifest: DependencyManifest,
  options: CheckOptions = {},
): Promise<DependencyReport> {
  const f = options.fetch ?? fetch;
  const now = options.now ?? new Date();
  const osv = (options.osvUrl ?? "https://api.osv.dev").replace(/\/+$/, "");
  const registry = (options.registryUrl ?? "https://registry.npmjs.org").replace(/\/+$/, "");
  const timeout = () => AbortSignal.timeout(options.timeoutMs ?? 15_000);
  const minAge = options.minimumReleaseAgeMs ?? 3 * 86_400_000;
  const errors: string[] = [];

  // Advisories: one batch query per 500 packages, then details per vuln id.
  const vulnIdsByPackage = new Map<number, string[]>();
  for (let start = 0; start < manifest.packages.length; start += 500) {
    const chunk = manifest.packages.slice(start, start + 500);
    try {
      const res = await f(`${osv}/v1/querybatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: chunk.map((p) => ({ package: { name: p.name, ecosystem: "npm" }, version: p.version })),
        }),
        signal: timeout(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { results?: { vulns?: { id: string }[] }[] };
      (body.results ?? []).forEach((r, i) => {
        const ids = (r.vulns ?? []).map((v) => v.id);
        if (ids.length) vulnIdsByPackage.set(start + i, ids);
      });
    } catch (e) {
      errors.push(`osv querybatch: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const uniqueIds = [...new Set([...vulnIdsByPackage.values()].flat())];
  const vulns = new Map<string, OsvVuln>();
  await mapLimit(uniqueIds, 4, async (id) => {
    try {
      const res = await f(`${osv}/v1/vulns/${encodeURIComponent(id)}`, { signal: timeout() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      vulns.set(id, (await res.json()) as OsvVuln);
    } catch (e) {
      errors.push(`osv ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  const advisories: DependencyAdvisory[] = [];
  for (const [index, ids] of vulnIdsByPackage) {
    const pkg = manifest.packages[index]!;
    for (const id of ids) {
      const v = vulns.get(id);
      const fixes = (v?.affected ?? [])
        .filter((a) => a.package?.ecosystem === "npm" && a.package?.name === pkg.name)
        .flatMap((a) => a.ranges ?? [])
        .flatMap((r) => r.events ?? [])
        .map((e) => e.fixed)
        .filter((x): x is string => Boolean(x) && compareVersions(x!, pkg.version) > 0)
        .sort(compareVersions);
      const severity = normalizeSeverity(v?.database_specific?.severity);
      advisories.push({
        id,
        aliases: v?.aliases ?? [],
        severity,
        package: pkg.name,
        deployed: pkg.version,
        fixed_in: fixes[0] ?? null,
        direct: pkg.direct,
        actionable: severity === "critical" || severity === "high",
        summary: (v?.summary || v?.details?.split("\n")[0] || "").slice(0, 300),
      });
    }
  }
  advisories.sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.package.localeCompare(b.package),
  );

  // Outdated direct dependencies: latest from dist-tags, publish time from
  // the full document only for the ones that are behind.
  const direct = [...new Map(manifest.packages.filter((p) => p.direct).map((p) => [p.name, p])).values()];
  const outdated: OutdatedDependency[] = [];
  await mapLimit(direct, 4, async (p) => {
    const name = p.name.startsWith("@") ? `@${encodeURIComponent(p.name.slice(1))}` : encodeURIComponent(p.name);
    try {
      const tags = await f(`${registry}/-/package/${name}/dist-tags`, { signal: timeout() });
      if (!tags.ok) throw new Error(`HTTP ${tags.status}`);
      const latest = ((await tags.json()) as { latest?: string }).latest;
      const update = latest ? updateKind(p.version, latest) : undefined;
      if (!latest || !update) return;
      let publishedAt: string | null = null;
      const doc = await f(`${registry}/${name}`, { signal: timeout() });
      if (doc.ok) publishedAt = ((await doc.json()) as { time?: Record<string, string> }).time?.[latest] ?? null;
      outdated.push({
        name: p.name,
        deployed: p.version,
        latest,
        latest_published_at: publishedAt,
        update,
        renovate_due: publishedAt !== null && now.getTime() - Date.parse(publishedAt) > minAge,
      });
    } catch (e) {
      errors.push(`npm ${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  outdated.sort((a, b) => ["major", "minor", "patch"].indexOf(a.update) - ["major", "minor", "patch"].indexOf(b.update) || a.name.localeCompare(b.name));

  return {
    checked_at: now.toISOString(),
    packages_total: manifest.packages.length,
    direct_total: direct.length,
    node_version: manifest.nodeVersion,
    lockfile_hash: manifest.lockfileHash,
    advisories,
    outdated,
    errors,
  };
}
