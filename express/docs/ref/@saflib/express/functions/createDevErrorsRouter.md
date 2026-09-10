[**@saflib/express**](../../../index.md)

---

# Function: createDevErrorsRouter()

> **createDevErrorsRouter**(): `Router`

Development-only mock error routes (ring buffer):

- `POST /errors/record` — browser client error capture
- `GET /admin/errors` — ring buffer listing (site-admin-only)

## Returns

`Router`
