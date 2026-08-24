/**
 * Security response header inspection helpers for Playwright specs.
 * @module @saflib/security/http/headers
 */

import { expect } from "@playwright/test";

/** Lower-case header names for case-insensitive lookup. */
export function normalizeHeaders(headers: {
  [name: string]: string;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

/** CSP `frame-ancestors 'none'` or unquoted `none` after the directive. */
export function cspDeniesFraming(csp: string): boolean {
  return /frame-ancestors\s+('none'|"none"|none)(\s|;|$)/i.test(csp);
}

/**
 * Dev stack: vite-plugin-vue-devtools iframes sibling SPAs at `/__devtools__/`.
 */
export function cspAllowsDevDevtoolsFraming(csp: string): boolean {
  return /frame-ancestors\s+'self'\s+http:\/\/\*\./i.test(csp);
}

export function hasBaselineCsp(csp: string): boolean {
  return /\bdefault-src\b/i.test(csp);
}

export function getContentSecurityPolicy(
  headers: Record<string, string>,
): string | undefined {
  const normalized = normalizeHeaders(headers);
  return (
    normalized["content-security-policy"] ??
    normalized["content-security-policy-report-only"]
  );
}

export type AssertSecurityHeadersOptions = {
  /** When true, CSP may allow dev Vue DevTools framing instead of `frame-ancestors 'none'`. */
  allowDevDevtoolsFraming?: boolean;
};

/**
 * Assert baseline edge security headers on an HTML/SPA response.
 * Matches Caddy `(security-headers)` + per-site CSP expectations used in SAF products.
 */
export function assertSecurityHeaders(
  headers: Record<string, string>,
  options: AssertSecurityHeadersOptions = {},
): void {
  const normalized = normalizeHeaders(headers);

  expect(normalized["x-content-type-options"]).toBe("nosniff");
  expect(normalized["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(normalized["cross-origin-opener-policy"]).toBe("same-origin");

  const permissionsPolicy = normalized["permissions-policy"];
  expect(permissionsPolicy).toBeDefined();
  expect(permissionsPolicy).toContain("geolocation=()");
  expect(permissionsPolicy).toContain("microphone=()");
  expect(permissionsPolicy).toContain("camera=()");

  const xfo = normalized["x-frame-options"];
  const csp = getContentSecurityPolicy(headers);
  const framingOk =
    xfo?.toUpperCase() === "DENY" ||
    (csp !== undefined && cspDeniesFraming(csp)) ||
    (options.allowDevDevtoolsFraming === true &&
      csp !== undefined &&
      cspAllowsDevDevtoolsFraming(csp));

  expect(
    framingOk,
    `Expected X-Frame-Options: DENY, CSP frame-ancestors 'none', or dev Vue DevTools framing; got xfo=${xfo}, csp=${csp ?? "(missing)"}`,
  ).toBe(true);

  expect(csp, "Expected Content-Security-Policy or -Report-Only").toBeDefined();
  expect(hasBaselineCsp(csp!), "Expected baseline default-src in CSP").toBe(
    true,
  );
}
