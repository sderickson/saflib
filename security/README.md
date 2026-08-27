# @saflib/security

Reusable security **toolkit** for SAF products — Playwright config factories and shared HTTP/browser test helpers. This package does **not** contain product policy (CSP allowlists, Caddyfiles, route-specific specs, or threat-model narrative).

## Division of labor

| Layer | Location | Owns |
| --- | --- | --- |
| **Tools** | `@saflib/security` (this package) | Playwright config factory, CSRF/cookie/header/CORS helpers, env presets, docs for extending the suite |
| **Golden product suite** | `saflib/base/security/` (copied to `{product}/security/` by `product/init`) | Playwright specs wired to base SPAs/API, starter `threat-model.md`, CI workflow |
| **Product suite** | `{product}/security/` | Same shape as base — specs for your routes, threat model you maintain, Caddy/deploy hardening |

Golden products ship `base/security/` out of the box. **Product owners** extend specs and maintain the threat model as surface area grows; `@saflib/security` helpers stay stable and portable across products.

Product-specific routes and fixtures belong in `{product}/security/` — start from the golden suite in `base/security/` when you scaffold a product.

## Package layout

Source lives in thematic folders — import by subpath (no root barrel):

| Folder | Import prefix | Contents |
| --- | --- | --- |
| `http/` | `@saflib/security/http/*` | Headers, cookies, CORS, CSRF helpers |
| `origins/` | `@saflib/security/origins/*` | Origin URL builders for specs |
| `playwright/` | `@saflib/security/playwright/*` | Config factories and env presets |

## What this package provides

- **`createSecurityPlaywrightConfig`** — prod-local docker compose suite (Chromium, serial workers, excludes `@canary`)
- **`createSecurityCanaryPlaywrightConfig`** — production HTTPS checks tagged `@canary`
- **`applyLocalDevSecurityEnv` / `applyProductionCanaryEnv`** — set `DOMAIN`, `PROTOCOL`
- **Origin helpers** — `apiOrigin`, `appOrigin`, `evilOrigin`, `kratosPublicOrigin`, `spaOrigin`, `apexUrl`
- **CSRF** — `getCsrfToken(page, origin)` via configurable issuer GET
- **Headers** — `assertSecurityHeaders`, CSP framing helpers
- **Cookies** — `findSessionCookie`, `findCsrfCookie`, attribute assertions
- **CORS** — `assertCorsDoesNotAllowOrigin`, `assertCorsAllowsOrigin`

External scanners (ZAP, testssl.sh, nmap, Trivy) and host runbooks stay in the **product** `security/` folder — document your approach in `{product}/security/pen-testing-tools.md` alongside the Playwright suite.

## Quick start (product security folder)

```typescript
// {product}/security/playwright-env.ts
import { applyLocalDevSecurityEnv } from "@saflib/security/playwright/env";

applyLocalDevSecurityEnv("myproduct.docker.localhost");
```

```typescript
// {product}/security/playwright.config.ts
import "./playwright-env.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSecurityPlaywrightConfig } from "@saflib/security/playwright/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createSecurityPlaywrightConfig({ testDir: dirname });
```

```typescript
// {product}/security/security-headers.spec.ts
import { test, expect } from "@playwright/test";
import { spaOrigin } from "@saflib/security/origins/urls";
import { assertSecurityHeaders } from "@saflib/security/http/headers";

const SPA_SUBDOMAINS = ["app", "auth", "admin", "account"] as const;

for (const sub of SPA_SUBDOMAINS) {
  test(`SPA root ${sub} exposes security headers`, async ({ request }) => {
    const url = `${spaOrigin(sub)}/`;
    const res = await request.get(url);
    expect(res.ok(), `GET ${url} → ${res.status()}`).toBe(true);
    assertSecurityHeaders(res.headers(), { allowDevDevtoolsFraming: true });
  });
}
```

Run against a running dev stack:

```bash
cd {product}/security && npm run test:e2e
```

## Production canary (`@canary`)

Tag specs with `{ tag: "@canary" }` for HTTPS-only checks (secure cookies, transport, marketing apex). Use a separate config:

```typescript
// {product}/security/playwright.canary.config.ts
import { applyProductionCanaryEnv } from "@saflib/security/playwright/env";
import { createSecurityCanaryPlaywrightConfig } from "@saflib/security/playwright/canary-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

applyProductionCanaryEnv("example.com");

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createSecurityCanaryPlaywrightConfig({ testDir: dirname });
```

Set `SECURITY_CANARY_KRATOS_EMAIL` and `SECURITY_CANARY_KRATOS_PASSWORD` in CI secrets for login-based canary specs.

## Extending for your product

1. Copy spec **patterns** from `base/security/` — adapt routes, fixtures, and SPA subdomains for `{product}/security/`.
2. Colocate fixtures with the specs or pages they exercise (e.g. `login.fixture.ts` beside `login.spec.ts`) so they change together.
3. Update `{product}/security/threat-model.md` — list shipped controls and owner responsibilities.
4. Wire CI to run `playwright test` on PRs when http/clients/Caddy change.

## Fast-follow (documented, not wired in base)

When moving beyond env-file secrets and local observability:

- Infisical / Cloudflare / hosted Sentry / PostHog / Grafana / Loki — env-key swap guides belong in product docs; helpers here stay deployment-agnostic.
