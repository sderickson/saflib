[**@saflib/express**](../index.md)

---

# Interface: AuthMiddlewareOptions

## Properties

### ~~adminRequired?~~

> `optional` **adminRequired**: `boolean`

#### Deprecated

Prefer the OpenAPI `site-admin-only` tag. Kept for callers that
do not run OpenAPI validation middleware.

---

### emailVerificationRequired?

> `optional` **emailVerificationRequired**: `boolean`

When true, respond with 403 unless `auth.emailVerified` is true.

---

### mfaRequired?

> `optional` **mfaRequired**: `boolean`

When true, respond with 403 unless the session meets MFA (AAL2+).
Site-admin routes also require MFA via the `site-admin-only` tag.
