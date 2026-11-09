/** Minimal semver handling for comparing release versions (no ranges). */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
}

export function parseVersion(v: string): ParsedVersion | undefined {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(v.trim());
  if (!m) return undefined;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), prerelease: m[4] ?? "" };
}

/** -1, 0 or 1; unparseable versions compare equal. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return 0;
  for (const k of ["major", "minor", "patch"] as const) {
    if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  }
  if (x.prerelease === y.prerelease) return 0;
  // A release sorts after its prereleases.
  if (!x.prerelease) return 1;
  if (!y.prerelease) return -1;
  return x.prerelease < y.prerelease ? -1 : 1;
}

/** The kind of update from `from` to `to`, or undefined if `to` isn't newer. */
export function updateKind(from: string, to: string): "major" | "minor" | "patch" | undefined {
  const x = parseVersion(from);
  const y = parseVersion(to);
  if (!x || !y || compareVersions(from, to) >= 0) return undefined;
  if (y.major !== x.major) return "major";
  if (y.minor !== x.minor) return "minor";
  return "patch";
}
