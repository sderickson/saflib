[**@saflib/express**](../../../index.md)

---

# Function: createErrorsRouter()

> **createErrorsRouter**(): `Router`

Production error routes (always mounted):

- `POST /csp-violations` — browser CSP reports
- `POST /admin/test-error` — intentional server error (site-admin-only)

## Returns

`Router`
