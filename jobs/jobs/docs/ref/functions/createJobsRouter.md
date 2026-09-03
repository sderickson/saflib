[**@saflib/jobs**](../index.md)

---

# Function: createJobsRouter()

> **createJobsRouter**(`options`): `Router`

Admin jobs router for monolith chrome (list/get/cancel-by-chain).
Only handles `/jobs/*` — other paths fall through so sibling chrome routers
(e.g. cron) can run. Error middleware is scoped to `/jobs` for the same reason.

## Parameters

| Parameter | Type                                                                  |
| --------- | --------------------------------------------------------------------- |
| `options` | [`CreateJobsRouterOptions`](../interfaces/CreateJobsRouterOptions.md) |

## Returns

`Router`
