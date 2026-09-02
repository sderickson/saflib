[**@saflib/express**](../../../index.md)

---

# Function: createErrorsRouter()

> **createErrorsRouter**(): `Router`

Unified error reporting (always mounted, including production / prod-local):

- `POST /errors/record` — browser client error capture
- `POST /csp-violations` — browser CSP reports → same ring buffer
- `POST /admin/test-error` — intentional server error (site-admin-only)
- `GET /admin/errors` — ring buffer listing (site-admin-only)

## Returns

`Router`
