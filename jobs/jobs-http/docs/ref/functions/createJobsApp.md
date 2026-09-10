[**@saflib/jobs-http**](../index.md)

---

# Function: createJobsApp()

> **createJobsApp**(`options`): `Express`

Express app for the jobs internal surface (enqueue only).
Host with `startExpressServer(app, { socketPath })` so requests are
markInternal'd and assertion auth applies.

## Parameters

| Parameter | Type                                                        |
| --------- | ----------------------------------------------------------- |
| `options` | [`JobsServiceOptions`](../interfaces/JobsServiceOptions.md) |

## Returns

`Express`
