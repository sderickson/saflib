import { expect, test } from "@playwright/test";
import { spaOrigin } from "@saflib/security/origins/urls";
import { assertSecurityHeaders } from "@saflib/security/http/headers";

/**
 * Dev / prod-local: every SPA subdomain root must carry edge security headers
 * (Caddy `(security-headers)` + CSP). Marketing apex covered by @canary when deployed.
 */
const SPA_SUBDOMAINS = ["app", "auth", "admin", "account"] as const;

for (const sub of SPA_SUBDOMAINS) {
  test(`SPA root ${sub} exposes security headers`, async ({ request }) => {
    const url = `${spaOrigin(sub)}/`;
    const res = await request.get(url);
    expect(res.ok(), `GET ${url} → ${res.status()}`).toBe(true);
    assertSecurityHeaders(res.headers(), { allowDevDevtoolsFraming: true });
  });
}
