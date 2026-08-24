/**
 * CORS response header assertions for security Playwright specs.
 * @module @saflib/security/http/cors
 */

import { expect } from "@playwright/test";
import { normalizeHeaders } from "./headers.ts";

/** Read `Access-Control-Allow-Origin` case-insensitively. */
export function getAccessControlAllowOrigin(
  headers: Record<string, string>,
): string | undefined {
  return normalizeHeaders(headers)["access-control-allow-origin"];
}

/**
 * Disallowed origins must not receive a reflected ACAO or wildcard.
 */
export function assertCorsDoesNotAllowOrigin(
  headers: Record<string, string>,
  disallowedOrigin: string,
): void {
  const acao = getAccessControlAllowOrigin(headers);
  expect(
    acao,
    "Disallowed Origin must not receive Access-Control-Allow-Origin (use an explicit allowlist)",
  ).not.toBe(disallowedOrigin);
  expect(acao, "Reflect-everything CORS must not echo arbitrary origins").not.toBe(
    "*",
  );
}

/** Allowed SPA origin should be echoed exactly on preflight/simple responses. */
export function assertCorsAllowsOrigin(
  headers: Record<string, string>,
  allowedOrigin: string,
): void {
  const acao = getAccessControlAllowOrigin(headers);
  expect(acao).toBeDefined();
  expect(acao).toBe(allowedOrigin);
}
