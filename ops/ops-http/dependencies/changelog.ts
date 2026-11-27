import { compareVersions } from "./semver.ts";

/** One release between the deployed and latest version, from GitHub. */
export interface ReleaseNote {
  version: string;
  published_at: string | null;
  url: string;
  /** Release notes as plain text (outside text; trimmed). Rendered escaped. */
  body: string;
}

const NOTE_MAX_CHARS = 1500;
const MAX_NOTES = 10;

/**
 * The package's repository as an https URL (GitHub ones as
 * https://github.com/owner/repo), from an npm document's `repository`.
 */
export function repositoryUrl(repository: unknown): string | null {
  const raw = typeof repository === "string" ? repository : (repository as { url?: unknown } | null)?.url;
  if (typeof raw !== "string" || !raw.trim()) return null;
  let s = raw.trim();
  const shorthand = /^(?:github:)?([\w.-]+)\/([\w.-]+)$/.exec(s);
  if (shorthand) return `https://github.com/${shorthand[1]}/${shorthand[2]!.replace(/\.git$/, "")}`;
  s = s.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/^ssh:\/\/git@/, "https://").replace(/^git@([^:]+):/, "https://$1/");
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const path = u.pathname.replace(/\.git$/, "").replace(/\/+$/, "");
    return `https://${u.host}${path}`;
  } catch {
    return null;
  }
}

/** "owner/repo" for GitHub repository URLs. */
export function githubRepo(url: string | null): string | null {
  const m = url ? /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/.exec(url) : null;
  return m ? `${m[1]}/${m[2]}` : null;
}

/** Where to read about new versions: GitHub releases, else the npm versions tab. */
export function releasesUrl(name: string, repo: string | null): string {
  const gh = githubRepo(repo);
  return gh ? `https://github.com/${gh}/releases` : `https://www.npmjs.com/package/${name}?activeTab=versions`;
}

/** The version a release tag names for this package ("v1.2.3", "1.2.3", "name@1.2.3"), else null. */
export function tagVersion(tag: string, name: string): string | null {
  const t = tag.trim();
  if (t.startsWith(`${name}@`)) return t.slice(name.length + 1).replace(/^v/, "");
  if (/^v?\d+\.\d+\.\d+[\w.+-]*$/.test(t)) return t.replace(/^v/, "");
  return null;
}

/** Markdown-ish notes to readable plain text, trimmed. */
export function plainNotes(body: string): string {
  const text = body
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > NOTE_MAX_CHARS ? `${text.slice(0, NOTE_MAX_CHARS - 1)}…` : text;
}

type GitHubRelease = { tag_name?: string; html_url?: string; published_at?: string | null; body?: string | null; draft?: boolean; prerelease?: boolean };

/**
 * Releases after `deployed` up to and including `latest`, newest first (at
 * most 10). Null when the notes can't be had (not GitHub, rate limited, no
 * matching tags) — the releases link still works.
 */
export async function fetchReleaseNotes(
  f: typeof fetch,
  opts: { name: string; repo: string | null; deployed: string; latest: string; token?: string; signal: () => AbortSignal; apiUrl?: string },
): Promise<ReleaseNote[] | null> {
  const gh = githubRepo(opts.repo);
  if (!gh) return null;
  const api = (opts.apiUrl ?? "https://api.github.com").replace(/\/+$/, "");
  const res = await f(`${api}/repos/${gh}/releases?per_page=50`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "saflib-ops-dependencies",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    signal: opts.signal(),
  });
  if (!res.ok) return null;
  const releases = (await res.json()) as GitHubRelease[];
  const notes: ReleaseNote[] = [];
  for (const r of releases) {
    if (r.draft || !r.tag_name) continue;
    const version = tagVersion(r.tag_name, opts.name);
    if (!version) continue;
    if (compareVersions(version, opts.deployed) <= 0 || compareVersions(version, opts.latest) > 0) continue;
    notes.push({ version, published_at: r.published_at ?? null, url: r.html_url ?? `https://github.com/${gh}/releases`, body: plainNotes(r.body ?? "") });
  }
  notes.sort((a, b) => compareVersions(b.version, a.version));
  return notes.length ? notes.slice(0, MAX_NOTES) : null;
}
