/**
 * Read `email` from a raw query string. Unlike `URLSearchParams` / Vue
 * `route.query`, bare `+` is kept as `+` (plus-addressing), not turned into a
 * space — form-encoding would otherwise break `user+tag@example.com`.
 */
export function emailFromSearch(search: string): string | undefined {
  const q = search.startsWith("?") ? search.slice(1) : search;
  for (const part of q.split("&")) {
    const eq = part.indexOf("=");
    if (eq === -1) {
      continue;
    }
    if (part.slice(0, eq) !== "email") {
      continue;
    }
    const raw = part.slice(eq + 1);
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw.replace(/\+/g, "%2B")).trim();
    } catch {
      return undefined;
    }
    return decoded.length > 0 ? decoded : undefined;
  }
  return undefined;
}

export function parseMarketingUnsubscribeEmail(
  query: Record<string, unknown>,
  fullPathOrSearch?: string,
): string | undefined {
  if (typeof fullPathOrSearch === "string" && fullPathOrSearch.length > 0) {
    const qIndex = fullPathOrSearch.indexOf("?");
    const search =
      qIndex >= 0 ? fullPathOrSearch.slice(qIndex) : fullPathOrSearch;
    const fromSearch = emailFromSearch(search);
    if (fromSearch !== undefined) {
      return fromSearch;
    }
  }

  const raw = query.email;
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
