# Operation tags

OpenAPI `tags` on operations are **behavioral contracts**, not documentation
labels. Only the tags below are allowed. Package / resource grouping is inferred
from which `*-spec` package owns the route — do not invent grouping tags.

Enforced by:

- `assertOpenApiOperationTags` when `createOpenApiValidator` / jobs
  `buildOperationMap` load a document (startup)
- `assertOpenApiRouteFileTags` in each spec package’s tests

| Tag           | Effect                                  | Enforced by            |
| ------------- | --------------------------------------- | ---------------------- |
| `csrf-exempt` | Skip CSRF on unsafe methods             | `@saflib/express` csrf |
| `background`  | Job queue may invoke this `operationId` | `@saflib/jobs-http`    |

Import constants from `@saflib/openapi` (`OPENAPI_TAG_*`) in middleware — do not
hard-code tag strings elsewhere.

## Access is not a tag

Every operation declares its access with OpenAPI `security`, or is marked
public with `x-public: true`. `@saflib/express` compiles this at mount time
(`createScopedMiddleware` / `makeRegisterRoute`) and throws if an operation
declares neither; `assertOpenApiRouteFileTags` checks route YAML in each spec
package's tests.

| Access                     | OpenAPI                                          |
| -------------------------- | ------------------------------------------------ |
| Public                     | `x-public: true` (`security: []` is rejected)    |
| Any signed-in user         | `security: [{ session: [] }]`                    |
| Verified email + MFA       | `security: [{ session: [email-verified, mfa] }]` |
| Site admin (+ email + MFA) | `security: [{ session: [site-admin] }]`          |

Products add their own schemes (e.g. `org: [paid]`) by passing
`securityResolvers` to `makeRegisterRoute`; the scheme is listed alongside
`session` in the same requirement. The former access tags (`no-auth`,
`email-verified`, `mfa-required`, `site-admin-only`) are rejected.
