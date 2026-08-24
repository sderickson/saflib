/**
 * Cookie attribute assertions for security Playwright specs.
 * @module @saflib/security/http/cookies
 */

import { expect, type Cookie } from "@playwright/test";

/** Ory/Kratos session cookie (excludes CSRF and continuity cookies). */
export function findSessionCookie(cookies: Cookie[]): Cookie | undefined {
  return cookies.find(
    (cookie) =>
      /session/i.test(cookie.name) &&
      !/csrf|xsrf|continuity/i.test(cookie.name),
  );
}

/** Double-submit CSRF cookie set by `@saflib/express` CSRF middleware. */
export function findCsrfCookie(cookies: Cookie[]): Cookie | undefined {
  return cookies.find((cookie) => cookie.name === "_csrf_token");
}

export type SecureCookieAssertionOptions = {
  /** When false, `secure` may be unset (local HTTP dev). Default true. */
  requireSecure?: boolean;
};

/** Assert session cookie hardening (HttpOnly, SameSite, Secure in prod). */
export function assertSecureSessionCookie(
  cookie: Cookie,
  options: SecureCookieAssertionOptions = {},
): void {
  const requireSecure = options.requireSecure ?? true;
  expect(cookie.httpOnly).toBe(true);
  if (requireSecure) {
    expect(cookie.secure).toBe(true);
  }
  expect(["Lax", "Strict", "None"]).toContain(cookie.sameSite);
}

/** Assert double-submit CSRF cookie shape (readable by JS, host-only domain). */
export function assertCsrfCookie(
  cookie: Cookie,
  options: SecureCookieAssertionOptions = {},
): void {
  const requireSecure = options.requireSecure ?? true;
  expect(cookie.httpOnly).toBe(false);
  expect(cookie.sameSite).toBe("Lax");
  if (requireSecure) {
    expect(cookie.secure).toBe(true);
  }
  expect(cookie.domain).toMatch(/^\./);
}
