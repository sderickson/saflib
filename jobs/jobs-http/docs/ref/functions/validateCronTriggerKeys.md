[**@saflib/jobs-http**](../index.md)

---

# Function: validateCronTriggerKeys()

> **validateCronTriggerKeys**(`triggerMap`, `cronJobNames`): `void`

Product-side check: every `cron:` trigger-map key names a registered cron
job, and every registered cron job has a `cron:` trigger-map entry.
Call at service startup with `Object.keys(jobsMap)` (no `@saflib/cron-http` import).

## Parameters

| Parameter      | Type                                          |
| -------------- | --------------------------------------------- |
| `triggerMap`   | [`TriggerMap`](../type-aliases/TriggerMap.md) |
| `cronJobNames` | `Iterable`\<`string`\>                        |

## Returns

`void`
