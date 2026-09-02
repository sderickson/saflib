[**@saflib/express**](../../../index.md)

---

# Interface: ScopedMiddlewareOptions

Options for creating scoped middleware.

## Properties

### adminRequired?

> `optional` **adminRequired**: `boolean`

---

### apiSpec?

> `optional` **apiSpec**: `OpenApiDocument`

---

### emailVerificationRequired?

> `optional` **emailVerificationRequired**: `boolean`

---

### enforceAuth?

> `optional` **enforceAuth**: `boolean`

---

### fileUploader?

> `optional` **fileUploader**: `Options`

---

### mfaRequired?

> `optional` **mfaRequired**: `boolean`

When true, require an MFA session (AAL2+), same as the `mfa-required` OpenAPI tag.
