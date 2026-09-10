[**@saflib/express**](../../../index.md)

---

# Function: createDevAnalyticsRouter()

> **createDevAnalyticsRouter**(): `Router`

Development-only in-memory product event buffer:

- `POST /product-events/record` — browser event capture into the ring buffer
- `GET /admin/product-events` — ring buffer listing for the admin SPA

## Returns

`Router`
