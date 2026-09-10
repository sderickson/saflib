[**@saflib/cron-http**](../index.md)

---

# Function: createCronRouter()

> **createCronRouter**(`options`): `Router`

Creates a router that your own Express app can include, in
order to serve cron API endpoints. These provide runtime
information and the ability do enable/disable cron jobs.
They are only accessible to admin users.

Only handles `/cron/*` — other paths fall through so sibling chrome routers
(e.g. jobs admin) can run when mounted after this router.

## Parameters

| Parameter | Type                                                        |
| --------- | ----------------------------------------------------------- |
| `options` | [`CronServiceOptions`](../interfaces/CronServiceOptions.md) |

## Returns

`Router`
