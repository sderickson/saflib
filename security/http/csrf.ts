/**
 * CSRF helpers for security Playwright suites.
 * @module @saflib/security/http/csrf
 */

import { expect, type Page } from "@playwright/test";
import { findCsrfCookie } from "./cookies.ts";

export type GetCsrfTokenOptions = {
  /**
   * Authenticated GET path that issues `_csrf_token` without extra context
   * (org header, etc.). Default `/user-configs/mine` — the global CSRF issuer
   * in SAF base products.
   */
  issuerPath?: string;
};

/**
 * Fetch a double-submit CSRF token via an authenticated GET that sets
 * `_csrf_token` on the API origin.
 */
export async function getCsrfToken(
  page: Page,
  origin: string,
  options: GetCsrfTokenOptions = {},
): Promise<string> {
  const issuerPath = options.issuerPath ?? "/user-configs/mine";
  const res = await page.request.get(`${origin}${issuerPath}`);
  expect(
    res.ok(),
    `Expected CSRF issuer GET ${issuerPath} to succeed, got ${res.status()}`,
  ).toBeTruthy();

  const cookies = await page.context().cookies(origin);
  const token = findCsrfCookie(cookies)?.value;
  expect(
    token,
    `Expected _csrf_token after GET ${issuerPath} (global CSRF issuer)`,
  ).toBeTruthy();
  return token!;
}
