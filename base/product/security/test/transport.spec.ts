import { expect, test } from "@playwright/test";

/**
 * Canary against production HTTPS: HTTP→HTTPS, HSTS, and Caddy Server hygiene.
 * Run: `npm run test:e2e:canary`.
 */
const domain = process.env.DOMAIN ?? "example.com";

const PUBLIC_HOSTS = [
  domain,
  `app.${domain}`,
  `auth.${domain}`,
  `admin.${domain}`,
  `account.${domain}`,
  `api.${domain}`,
  `kratos.${domain}`,
] as const;

const MIN_HSTS_MAX_AGE = 31_536_000;

function parseHstsMaxAge(hsts: string): number {
  const m = /max-age=(\d+)/i.exec(hsts);
  expect(
    m,
    `Could not parse max-age from Strict-Transport-Security: ${hsts}`,
  ).not.toBeNull();
  return parseInt(m![1], 10);
}

/** If Server identifies as Caddy, it must not include a dotted version. */
function assertNoCaddyVersionLeak(server: string | undefined): void {
  if (server === undefined || !/caddy/i.test(server)) {
    return;
  }
  expect(
    server,
    `Server header should not leak Caddy version: ${server}`,
  ).not.toMatch(/caddy\s*\/\s*\d+\.\d+/i);
}

test.describe("transport", { tag: "@canary" }, () => {
  for (const host of PUBLIC_HOSTS) {
    test(`http://${host}/ redirects to HTTPS`, async ({ request }) => {
      const res = await request.get(`http://${host}/`, { maxRedirects: 0 });
      expect(
        res.status(),
        `Expected 3xx redirect for http://${host}/`,
      ).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      const location = res.headers()["location"];
      expect(location, "Redirect Location header").toBeDefined();
      expect(location!.toLowerCase().startsWith("https://")).toBe(true);
    });

    test(`https://${host}/ sends HSTS and avoids leaking Caddy version`, async ({
      request,
    }) => {
      const res = await request.get(`https://${host}/`, { maxRedirects: 0 });
      const hsts = res.headers()["strict-transport-security"];
      expect(
        hsts,
        `Strict-Transport-Security missing on https://${host}/ (status ${res.status()})`,
      ).toBeDefined();
      expect(parseHstsMaxAge(hsts!)).toBeGreaterThanOrEqual(MIN_HSTS_MAX_AGE);
      assertNoCaddyVersionLeak(res.headers()["server"]);
    });
  }
});
