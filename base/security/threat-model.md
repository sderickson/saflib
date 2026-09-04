# Base product threat model (starter stub)

> Status: **starter stub** — shipped with `saflib/base`. **Product owners** replace
> this with a living threat model as surface grows. Companion suite:
> Playwright specs in this folder; toolkit helpers in [@saflib/security](../../security/docs/01-overview.md).

This stub lists controls the golden product ships out of the box. It is **not** a
full narrative — expand §threats / §controls as you add routes,
integrations, and deploy targets.

## Division of labor

| Layer                                                    | Owns                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [@saflib/security](../../security/docs/01-overview.md) | Portable Playwright helpers (headers, CSRF, CORS, cookies, config factories) |
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
5. Keep the **Operator hygiene** practices current for your real vendors and machines (MFA, gated keys, panic / quarterly runbooks).

## Operator hygiene (outside the repo)

Code and Playwright specs cannot secure accounts, laptops, or CI credentials. Product
owners should treat the following as **human-operating requirements** for any hosted
deployment — they matter as much as the shipped middleware.

### Require MFA on every integrated service

Turn on **org- or team-level “require MFA / 2FA”** wherever the vendor supports it:
cloud consoles (GCP / AWS / Azure), GitHub, secrets manager, domain registrar, email
provider, observability (Sentry, Grafana, PostHog), billing, password manager, and any
OAuth / SaaS product your stack talks to.

Where the vendor only offers self-enrollment, confirm every human with access has
enrolled — and re-check after membership changes. Prefer **hardware security keys** for
highest-blast-radius accounts (registrar, GitHub org owners, cloud project owners,
password manager).

### Gate SSH, deploy, and GitHub keys behind a second check

Do **not** leave private keys on disk as plaintext files that any process on the laptop
can read. Store SSH keys (and similar deploy / GitHub signing material) in a password
manager that exposes them only through an **agent requiring biometric or interactive
approval** — e.g. [1Password SSH agent](https://developer.1password.com/docs/ssh/).

That gate is especially important once **coding agents** run on the same machine: without
it, a compromised or over-scoped agent session can SSH to the host, push to the repo, or
use a long-lived PAT without you noticing. Prefer short-lived, least-privilege tokens;
revoke stale deploy keys and PATs on a cadence.

### Other high-leverage habits

| Habit | Why |
| --- | --- |
| **Disk encryption + short screen-lock** | Stolen unlocked laptop ≈ prod if secrets or SSH live there. |
| **Dedicated browser profile for admin / prod** | Blocks personal extensions and cross-site spillover from reading admin tabs. |
| **Secrets in a remote store (e.g. Infisical), not only `.env` on laptops** | Laptop compromise should not equal full prod secret access. |
| **Panic playbook** (lost device / suspected compromise) | Ordered revocation (GitHub → secrets → cloud → app sessions → vendors) beats improvising under stress. |
| **Quarterly credential pass** | Rotate or confirm long-lived API keys, PATs, webhooks, and “require MFA” still on. |
| **PR review + no auto-merge of dependency bots** | Supply-chain changes need human eyes before they reach `main` / deploy. |
| **Single monitored alerts channel** | Sentry, scans, and watchdog noise only help if someone triages them. |
| **Offline recovery kit** for the password manager | Paper (or equivalent) in a physical safe; test that you can still recover. |

Expand product-specific threat models once you have a real host, vendors, and on-call
shape — keep this section as the portable checklist that survives product-init copies.

## Suggested next steps

- Replace secrets with remote store such as Infisical (and stop keeping prod-shaped tokens on laptops).
- Add Cloudflare WAF (or equivalent edge rate-limit / DDoS).
- Store audit logs on a schedule in a secure location, and integrity reports in a separate accessible location.
- Write a short panic playbook and quarterly vendor-key checklist for your deploy.

## Running the suite

```bash
# Terminal A — base stack
cd saflib/base/dev && npm run up

# Terminal B — security regression (excludes @canary)
cd saflib/base/security && npm run test:e2e
```
