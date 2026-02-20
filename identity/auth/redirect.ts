import { getHost } from "@saflib/links";

const AUTH_REDIRECT_KEY = "saf_auth_redirect";

/** Accepts Vue Router route or any object with a query that may have a redirect value. */
export interface RouteLike {
  query: Record<string, unknown>;
}

/**
 * Resolve redirect target: URL query param (and persist to sessionStorage), then sessionStorage, then fallback.
 * Call when rendering auth pages so that internal navigation (login ↔ register) preserves the redirect.
 */
export function getRedirectTarget(
  route: RouteLike,
  fallback?: string,
): string | undefined {
  const raw = route.query.redirect;
  const fromQuery =
    typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] as string) : null;
  const fromQueryStr = fromQuery ?? undefined;
  if (fromQueryStr) {
    try {
      const decoded = decodeURIComponent(fromQueryStr);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(AUTH_REDIRECT_KEY, decoded);
      }
      return decoded;
    } catch {
      return fallback;
    }
  }
  if (typeof sessionStorage !== "undefined") {
    const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    if (stored) return stored;
  }
  return fallback;
}

/** Clear persisted redirect after successful auth redirect. */
export function clearRedirectTarget(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  }
}

/**
 * Validate that the URL's hostname is on the allowed domain (current host's root), then redirect.
 * Prevents open redirect attacks. Returns true if redirect was performed, false if invalid or skipped.
 */
export function validateAndRedirect(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const allowedHost = getHost();
    const ok =
      u.hostname === allowedHost || u.hostname.endsWith("." + allowedHost);
    if (ok) {
      window.location.href = url;
      return true;
    }
  } catch {
    // invalid URL
  }
  return false;
}

/** If url is present, validate and redirect; on success clear sessionStorage. */
export function safeRedirect(url: string | undefined): void {
  if (validateAndRedirect(url)) {
    clearRedirectTarget();
  }
}
