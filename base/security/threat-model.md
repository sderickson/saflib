# Base product threat model (starter stub)

> Status: **starter stub** — shipped with `saflib/base`. **Product owners** replace
> this with a living threat model as surface grows. Companion suite:
> Playwright specs in this folder; toolkit helpers in `@saflib/security`.

This stub lists controls the golden product ships out of the box. It is **not** a
full narrative — expand §threats / §controls as you add routes,
integrations, and deploy targets.

## Division of labor

| Layer                                                    | Owns                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@saflib/security`                                       | Portable Playwright helpers (headers, CSRF, CORS, cookies, config factories) |
| `{product}/security/` (this folder after `product/init`) | Product specs, this threat model, product Caddy allowlists, CI wiring        |
| Product owner                                            | Ongoing threat-model maintenance, new specs for new surface, ops runbooks    |

## Shipped controls (base)

Portable subset of threat-model controls:

| Area                                                          | Where                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| TLS / HSTS, CSP, CORS allowlist, `-Server`                    | Caddy snippets in `base/dev/caddy-config` and `saflib/deploy/caddy`       |
| CSRF double-submit, authz tags, MFA hooks, OpenAPI validation | `@saflib/express`                                                         |
| CSP violation ingest → unified errors buffer                  | `@saflib/errors-http` (`POST /csp-violations`, `no-auth` + `csrf-exempt`) |
| Playwright regression                                         | This package (`npm run test:e2e` against `base/dev`)                      |
| Audit fail-closed (when wired)                                | `@saflib/audit-http` + product audit map                                  |
| Secrets                                                       | `createSecretStore({ type: "env" })` only                                 |

## Public API surface (skip Kratos `forward_auth` at Caddy + Express early auth gate)

Keep this list in sync with Caddy `@public_monolith`, `isPublicMonolithRoute` in
`base/service/http`, and OpenAPI `no-auth` tags:

- `GET /health`
- `POST /csp-violations` (also mounted via `@saflib/errors-http` in Express global middleware)
- `POST /user-configs/unsubscribe-marketing`
- `POST /errors/record`, `POST /product-events/record` (global middleware chrome)
- `GET /dev/logs`, `GET /dev/logs/stream` (development only; handler 403 otherwise)

## Owner responsibilities

1. Run `npm run test:e2e` in this package against a running stack before merging edge / HTTP / client changes.
2. Update this document whenever the security story changes.
3. Extend specs for new destructive or authz-sensitive routes (mirror patterns in `*.spec.ts`).
4. Production canary (`npm run test:e2e:canary`) — wire when you have a public HTTPS deploy.

## Suggested next steps

- Replace secrets with remote store such as Infisical.
- Add Cloudflare WAF.
- Store audit logs on the regular in a secure location, and reports in a separate accessible location.

## Running the suite

```bash
# Terminal A — base stack
cd saflib/base/dev && npm run up

# Terminal B — security regression (excludes @canary)
cd saflib/base/security && npm run test:e2e
```
