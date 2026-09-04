# Overview

`@saflib/security` is a reusable security **toolkit** for SAF products — Playwright config factories and shared HTTP/browser test helpers. It does not contain product policy (CSP allowlists, Caddyfiles, appropriate express middleware, etc.), but it helps make sure those things are specified and working as expected.

## Division of labor

| Layer                    | Location                                                                                                                           | Owns                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Tools**                | `@saflib/security` (this package)                                                                                                  | Playwright config factories, CSRF/cookie/header/CORS helpers, env presets                                             |
| **Golden product suite** | [`base/security/`](../../base/security/) (copied to `{product}/security/` by [product/init](../../product/docs/workflows/init.md)) | Playwright specs wired to base SPAs/API, starter [`threat-model.md`](../../base/security/threat-model.md), CI scripts |
| **Product suite**        | `{product}/security/`                                                                                                              | Specs for your routes, threat model you maintain, Caddy/deploy hardening                                              |

Golden products ship `base/security/` out of the box. **Product owners** extend specs and maintain the threat model as surface area grows; helpers here stay stable across products.

External scanners (ZAP, testssl.sh, nmap, Trivy) and host runbooks stay in the **product** `security/` folder — document your approach in `{product}/security/pen-testing-tools.md` alongside the Playwright suite.

## Package layout

| Folder        | Import prefix                   | Contents                             |
| ------------- | ------------------------------- | ------------------------------------ |
| `http/`       | `@saflib/security/http/*`       | Headers, cookies, CORS, CSRF helpers |
| `origins/`    | `@saflib/security/origins/*`    | Origin URL builders for specs        |
| `playwright/` | `@saflib/security/playwright/*` | Config factories and env presets     |

## What this package provides

| Area       | Exports                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright | [`createSecurityPlaywrightConfig`](./ref/@saflib/security/playwright/config/functions/createSecurityPlaywrightConfig.md) — prod-local suite (Chromium, serial workers, excludes `@canary`); [`createSecurityCanaryPlaywrightConfig`](./ref/@saflib/security/playwright/canary-config/functions/createSecurityCanaryPlaywrightConfig.md) — production HTTPS `@canary` specs |
| Env        | [`applyLocalDevSecurityEnv`](./ref/@saflib/security/playwright/env/functions/applyLocalDevSecurityEnv.md), [`applyProductionCanaryEnv`](./ref/@saflib/security/playwright/env/functions/applyProductionCanaryEnv.md) — set `DOMAIN` / `PROTOCOL`                                                                                                                           |
| Origins    | [`apiOrigin`](./ref/@saflib/security/origins/urls/functions/apiOrigin.md), [`spaOrigin`](./ref/@saflib/security/origins/urls/functions/spaOrigin.md), [`evilOrigin`](./ref/@saflib/security/origins/urls/functions/evilOrigin.md), …                                                                                                                                       |
| HTTP       | [`assertSecurityHeaders`](./ref/@saflib/security/http/headers/functions/assertSecurityHeaders.md), [`getCsrfToken`](./ref/@saflib/security/http/csrf/functions/getCsrfToken.md), cookie and CORS assertions                                                                                                                                                                |

These extend [@saflib/playwright](../playwright/docs/01-overview.md) (health gate, Chromium project) — security suites use a separate config factory, not the SPA default.

## Quick start

Golden reference: [`base/security/`](../../base/security/).

After initializing your product, run against a running dev stack (`{product}/dev` or deploy prod-local):

```bash
cd {product}/security && npm run test:e2e
```

## Production canary (`@canary`)

Tag specs with `{ tag: "@canary" }` for HTTPS-only checks (secure cookies, transport, marketing apex):

```typescript
// {product}/security/test/playwright.canary.config.ts
import { applyProductionCanaryEnv } from "@saflib/security/playwright/env";
import { createSecurityCanaryPlaywrightConfig } from "@saflib/security/playwright/canary-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

applyProductionCanaryEnv("example.com");

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createSecurityCanaryPlaywrightConfig({
  testDir: path.join(dirname, "."),
});
```

Create a dedicated test user and set `SECURITY_CANARY_KRATOS_EMAIL` and `SECURITY_CANARY_KRATOS_PASSWORD` in CI secrets for login-based canary specs. Run with `npm run test:e2e:canary` (see [`base/security/package.json`](../../base/security/package.json)).

## Extending for your product

1. Copy spec **patterns** from [`base/security/test/`](../../base/security/test/) — adapt routes, fixtures, and SPA subdomains.
2. Colocate fixtures with the specs they exercise (see [`base/security/fixtures/`](../../base/security/fixtures/)).
3. Update `{product}/security/threat-model.md` — list shipped controls and owner responsibilities.
4. Wire CI to run `playwright test` on PRs when http/clients/Caddy change.
