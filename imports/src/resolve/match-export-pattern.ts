/**
 * Match a Node.js package.json `exports` subpath pattern.
 *
 * Node allows **one** `*` per pattern key and target. The `*` is string
 * substitution: the capture may include `/` (nested subpaths).
 *
 * @see https://nodejs.org/api/packages.html#subpath-patterns
 */
export function matchExportPattern(
  importKey: string,
  patternKey: string,
  patternTarget: string,
): string | null {
  const keyStars = (patternKey.match(/\*/g) ?? []).length;
  const targetStars = (patternTarget.match(/\*/g) ?? []).length;
  if (keyStars !== 1 || targetStars !== 1) return null;

  const starIdx = patternKey.indexOf("*");
  const keyPrefix = patternKey.slice(0, starIdx);
  const keySuffix = patternKey.slice(starIdx + 1);

  if (!importKey.startsWith(keyPrefix)) return null;
  if (keySuffix.length > 0 && !importKey.endsWith(keySuffix)) return null;

  const captureEnd = importKey.length - keySuffix.length;
  if (captureEnd < keyPrefix.length) return null;
  const capture = importKey.slice(keyPrefix.length, captureEnd);

  // Reject empty capture (e.g. `./requests` vs `./requests/*`) and traversal.
  if (capture.length === 0) return null;
  for (const segment of capture.split("/")) {
    if (segment === "" || segment === "." || segment === ".." || segment === "node_modules") {
      return null;
    }
  }

  return patternTarget.replace("*", capture);
}

/** Prefer longer (more specific) pattern keys, matching Node's best-match preference. */
export function sortExportPatternKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a.localeCompare(b);
  });
}
