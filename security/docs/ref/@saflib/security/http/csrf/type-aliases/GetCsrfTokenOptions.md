[**@saflib/security**](../../../../../index.md)

---

# Type Alias: GetCsrfTokenOptions

> **GetCsrfTokenOptions** = `object`

## Properties

### issuerPath?

> `optional` **issuerPath**: `string`

Authenticated GET path that issues `_csrf_token` without extra context
(org header, etc.). Default `/user-configs/mine` — the global CSRF issuer
in SAF base products.
