[**@saflib/express**](../../../index.md)

---

# Function: createDevLogsRouter()

> **createDevLogsRouter**(): `Router`

Development-only Winston log viewer:

- `GET /dev/logs` — JSON snapshot of the in-memory ring buffer
- `GET /dev/logs/stream` — SSE of new (and optionally replayed) log entries

Gated on `DEPLOYMENT_NAME=development` and the ring buffer being enabled.

## Returns

`Router`
