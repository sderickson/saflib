[**@saflib/jobs-http**](../index.md)

---

# Function: runJobs()

> **runJobs**(`options`): `Promise`\<[`JobsRuntimeHandle`](../interfaces/JobsRuntimeHandle.md)>\>

Start the jobs claim loop, delivery workers, and periodic sweeps.
Validates the trigger map / operation config against `apiSpec` at startup.

## Parameters

| Parameter | Type                                                        |
| --------- | ----------------------------------------------------------- |
| `options` | [`JobsServiceOptions`](../interfaces/JobsServiceOptions.md) |

## Returns

`Promise`\<[`JobsRuntimeHandle`](../interfaces/JobsRuntimeHandle.md)\>
