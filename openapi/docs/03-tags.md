# Operation tags

OpenAPI `tags` on operations are **behavioral contracts**, not documentation
labels. Only the tags below are allowed. Package / resource grouping is inferred
from which `*-spec` package owns the route — do not invent grouping tags.

Enforced by:

- `assertOpenApiOperationTags` when `createOpenApiValidator` / jobs
  `buildOperationMap` load a document (startup)
- `assertOpenApiRouteFileTags` in each spec package’s tests

| Tag               | Effect                                      | Enforced by                   |
| ----------------- | ------------------------------------------- | ----------------------------- |
| `no-auth`         | Skip session auth and CSRF                  | `@saflib/express` auth + csrf |
| `csrf-exempt`     | Skip CSRF on unsafe methods                 | `@saflib/express` csrf        |
| `email-verified`  | Require verified email                      | `@saflib/express` auth        |
| `mfa-required`    | Require MFA when enforcement is on          | `@saflib/express` auth        |
| `site-admin-only` | Require site admin (+ verified email + MFA) | `@saflib/express` auth        |
| `background`      | Job queue may invoke this `operationId`     | `@saflib/jobs`                |

Import constants from `@saflib/openapi` (`OPENAPI_TAG_*`) in middleware — do not
hard-code tag strings elsewhere.
