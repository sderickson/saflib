/**
 * Hostname from a Host header, stripping an optional port.
 * Handles `host:8080` and bracketed IPv6 (`[::1]:5173`).
 */
export function hostnameFromHostHeader(
  host: string | undefined,
): string | undefined {
  if (!host) return undefined;
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  return host.split(":")[0];
}

/**
 * Pure logic for the subdomain proxy: given request URL and host, returns the
 * path to rewrite to (e.g. /auth/index.html?redirect=...) or null to pass through.
 * Used by the Vite dev server so path-based routing works when using subdomains.
 */
export function getSubdomainProxyRewrite(
  requestUrl: string | undefined,
  host: string | undefined,
  hosts: string[],
  domain: string,
): string | null {
  const pathname = requestUrl?.split("?")[0] ?? "/";
  const search = requestUrl?.includes("?")
    ? `?${requestUrl.slice(requestUrl.indexOf("?") + 1)}`
    : "";

  // Skip rewriting only when the path looks like a static asset (dot or @ in path),
  // not when the query string contains dots (e.g. ?redirect=http://app.recipes.docker.localhost/)
  if (pathname.includes(".") || pathname.includes("@")) {
    return null;
  }

  const hostname = hostnameFromHostHeader(host);

  if (hostname?.startsWith("localhost") || hostname === "[::1]") {
    return `/index.html${search}`;
  }

  for (const h of hosts) {
    if (hostname === h) {
      const subdomain = h
        .replace(domain, "")
        .split(".")
        .filter(Boolean)
        .join(".");
      const path = subdomain === "" ? "/index.html" : `/${subdomain}/index.html`;
      return `${path}${search}`;
    }
  }

  return null;
}
