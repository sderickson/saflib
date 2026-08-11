# OpenAPI operation tags

SAF route YAMLs use OpenAPI `tags` for cross-cutting behavior. Tags are
declarative markers on an operation — middleware and other framework code
read them from the bound OpenAPI schema. Prefer a tag over ad-hoc options
when the behavior should be visible in the spec.

## Auth and access tags

These are enforced by `@saflib/express` auth / CSRF middleware:

| Tag | Meaning |
| --- | --- |
| `no-auth` | Skip authentication and CSRF for this operation. |
| `csrf-exempt` | Skip CSRF only (still requires auth unless also `no-auth`). |
| `email-verified` | Require `auth.emailVerified`. |
| `mfa-required` | Require an MFA session (AAL2+). |
| `site-admin-only` | Require a site admin (also implies email verified + MFA). |

## Job queue tags

| Tag | Meaning |
| --- | --- |
| `background` | Marks an operation as invocable by the job queue. **Carries no auth semantics** — auth is still whatever other tags / middleware apply when the job is delivered. Foreground-only (no `background` tag) is the default. |

The jobs runtime and product trigger maps validate that every enqueue target
exists in the bundled app OpenAPI spec **and** carries `background`. Enqueue
of an untagged (or unknown) operationId is rejected (422). Startup validation
of the trigger map crashes the process if a mapped target is missing the tag.

Do **not** put `background` on jobs-service admin/internal routes themselves —
those are control-plane APIs. Put it on the **work** endpoints in the product
spec that the queue will call (e.g. a demo chain `jobsDemoStepB`).

## Grouping tags

Packages may also use resource or surface tags (e.g. `jobs`, `cron`) for
documentation grouping. Those have no framework semantics unless documented
here.
