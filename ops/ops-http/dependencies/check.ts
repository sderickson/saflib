import type { DependencyManifest } from "./manifest.ts";
import { compareVersions, updateKind } from "./semver.ts";
import { checkRuntime, type OsRelease, type RuntimeComponent } from "./runtime.ts";
import { cvss3BaseScore, severityFromScore } from "./cvss.ts";
import { osvEcosystem } from "./os-packages.ts";
import { fetchReleaseNotes, releasesUrl, repositoryUrl, type ReleaseNote } from "./changelog.ts";

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
  /** `npm`, or the base image's OS (e.g. `Debian:12`): fixed by rebuilding the image. */
  ecosystem?: string;
}

export interface OutdatedDependency {
  name: string;
  deployed: string;
  latest: string;
  latest_published_at: string | null;
  update: "major" | "minor" | "patch";
  /** The latest release is past the minimum release age, so Renovate should have a PR open. */
  renovate_due: boolean;
  /** The package's source repository, from npm. */
  repository_url?: string | null;
  /** Where to read about new versions (GitHub releases, else npm's versions tab). */
  releases_url?: string;
  /** GitHub release notes after the deployed version, newest first; null when unavailable. */
  release_notes?: ReleaseNote[] | null;
}

export interface DependencyReport {
  checked_at: string;
  packages_total: number;
  direct_total: number;
  node_version: string;
  lockfile_hash: string;
  advisories: DependencyAdvisory[];
  outdated: OutdatedDependency[];
  /** Node and the base OS, with their end-of-life dates. */
  runtime: RuntimeComponent[];
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
  endoflifeUrl?: string;
  /**
   * The server's OS, checked for end of life alongside the image's. The ops
   * router passes a Prometheus lookup (node_os_info) when metrics are on.
   */
  hostOs?: () => Promise<OsRelease | null>;
  timeoutMs?: number;
  /** Raises GitHub's rate limit for release notes (default GITHUB_TOKEN; works without). */
  githubToken?: string;
  githubApiUrl?: string;
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
  severity?: { type?: string; score?: string }[];
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

/** A severity word from OSV, else from its CVSS v3 vector. */
function osvSeverity(v: OsvVuln | undefined): AdvisorySeverity {
  const word = normalizeSeverity(v?.database_specific?.severity);
  if (word !== "unknown") return word;
  const vector = v?.severity?.find((s) => s.type === "CVSS_V3")?.score;
  const score = vector ? cvss3BaseScore(vector) : null;
  return score === null ? "unknown" : severityFromScore(score);
}

/**
 * CVEs in the base image's OS packages (Debian), only those the distro has
 * already fixed: a rebuild picks the fix up, and unfixed ones would be
 * hundreds of lines nobody can act on. Failures go in `errors` without
 * blocking the report (the npm check is the one that must succeed).
 */
async function checkOsPackages(
  manifest: DependencyManifest,
  ctx: { f: typeof fetch; osv: string; timeout: () => AbortSignal; errors: string[] },
): Promise<DependencyAdvisory[]> {
  const ecosystem = osvEcosystem(manifest.osRelease);
  const pkgs = ecosystem ? (manifest.osPackages ?? []) : [];
  if (!ecosystem || !pkgs.length) return [];
  const hit: number[] = [];
  try {
    const res = await ctx.f(`${ctx.osv}/v1/querybatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: pkgs.map((p) => ({ package: { name: p.name, ecosystem }, version: p.version })) }),
      signal: ctx.timeout(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { results?: { vulns?: unknown[] }[] };
    (body.results ?? []).forEach((r, i) => {
      if (r.vulns?.length) hit.push(i);
    });
  } catch (e) {
    ctx.errors.push(`osv ${ecosystem}: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
  // One full query per affected package (rather than one fetch per CVE).
  const out: DependencyAdvisory[] = [];
  await mapLimit(hit, 4, async (i) => {
    const pkg = pkgs[i]!;
    try {
      const res = await ctx.f(`${ctx.osv}/v1/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: { name: pkg.name, ecosystem }, version: pkg.version }),
        signal: ctx.timeout(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const v of ((await res.json()) as { vulns?: OsvVuln[] }).vulns ?? []) {
        // DSA/DLA advisories repeat the per-CVE records.
        if (/^(DSA|DLA)-/.test(v.id)) continue;
        const fixed = (v.affected ?? [])
          .filter((a) => a.package?.ecosystem === ecosystem && a.package?.name === pkg.name)
          .flatMap((a) => a.ranges ?? [])
          .flatMap((r) => r.events ?? [])
          .map((e) => e.fixed)
          .find((x): x is string => Boolean(x));
        if (!fixed) continue;
        const severity = osvSeverity(v);
        out.push({
          id: v.id,
          aliases: v.aliases ?? [],
          severity,
          package: pkg.name,
          deployed: pkg.version,
          fixed_in: fixed,
          direct: false,
          actionable: severity === "critical" || severity === "high",
          summary: (v.summary || v.details?.split("\n")[0] || "").slice(0, 300),
          ecosystem,
        });
      }
    } catch (e) {
      ctx.errors.push(`osv ${ecosystem} ${pkg.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  return out;
}

/**
 * Check a manifest against OSV.dev (advisories for every installed package)
 * the npm registry (latest version of each direct dependency), and
 * endoflife.date (Node's and the base OS's end of life). Never
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
      const severity = osvSeverity(v);
      advisories.push({
        ecosystem: "npm",
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
  advisories.push(...(await checkOsPackages(manifest, { f, osv, timeout, errors })));
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
      let repo: string | null = null;
      const doc = await f(`${registry}/${name}`, { signal: timeout() });
      if (doc.ok) {
        const body = (await doc.json()) as { time?: Record<string, string>; repository?: unknown };
        publishedAt = body.time?.[latest] ?? null;
        repo = repositoryUrl(body.repository);
      }
      outdated.push({
        repository_url: repo,
        releases_url: releasesUrl(p.name, repo),
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
  // What changed: GitHub release notes between the deployed and latest
  // version. Best effort; a missing note leaves the releases link.
  const githubToken = options.githubToken ?? process.env.GITHUB_TOKEN;
  await mapLimit(outdated, 3, async (o) => {
    try {
      o.release_notes = await fetchReleaseNotes(f, {
        name: o.name,
        repo: o.repository_url ?? null,
        deployed: o.deployed,
        latest: o.latest,
        token: githubToken,
        signal: timeout,
        apiUrl: options.githubApiUrl,
      });
    } catch {
      o.release_notes = null;
    }
  });
  outdated.sort((a, b) => ["major", "minor", "patch"].indexOf(a.update) - ["major", "minor", "patch"].indexOf(b.update) || a.name.localeCompare(b.name));

  let hostOs: OsRelease | null = null;
  if (options.hostOs) {
    try {
      hostOs = await options.hostOs();
    } catch (e) {
      errors.push(`host os: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const runtime = await checkRuntime(manifest.nodeVersion, manifest.osRelease ?? null, {
    hostOs,
    fetch: f,
    now,
    url: (options.endoflifeUrl ?? "https://endoflife.date").replace(/\/+$/, ""),
    signal: timeout,
    errors,
  });

  return {
    checked_at: now.toISOString(),
    packages_total: manifest.packages.length,
    direct_total: direct.length,
    node_version: manifest.nodeVersion,
    lockfile_hash: manifest.lockfileHash,
    advisories,
    outdated,
    runtime,
    errors,
  };
}
