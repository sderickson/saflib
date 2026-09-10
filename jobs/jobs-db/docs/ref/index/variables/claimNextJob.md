[**@saflib/jobs-db**](../../index.md)

---

# Variable: claimNextJob()

> `const` **claimNextJob**: (`dbKey`, `params`) => `Promise`\<`ReturnsError`\<`null` \| \{ `attempt`: `number`; `authority`: [`JobAuthority`](../type-aliases/JobAuthority.md); `concurrency_key`: `null` \| `string`; `created_at`: `Date`; `dedupe_key`: `null` \| `string`; `enqueued_by_operation_id`: `string`; `finished_at`: `null` \| `Date`; `heartbeat_at`: `null` \| `Date`; `id`: `string`; `max_attempts`: `number`; `operation_id`: `string`; `original_request_id`: `string`; `parent_job_id`: `null` \| `string`; `priority`: `number`; `request`: [`JobRequest`](../interfaces/JobRequest.md); `result`: `null` \| [`JobResult`](../interfaces/JobResult.md); `run_at`: `Date`; `started_at`: `null` \| `Date`; `status`: `"pending"` \| `"running"` \| `"retrying"` \| `"succeeded"` \| `"dead"` \| `"cancelled"`; `updated_at`: `Date`; `user_id`: `string`; \}, `never`>>\>\>

Atomically claim the highest-priority eligible job.

Eligibility: `pending`/`retrying`, `run_at <= now`, and no other `running`
job sharing a non-null `concurrency_key`. Sets `running`, `started_at`,
`heartbeat_at`, increments `attempt`. Returns the claimed row, or `null`.

## Parameters

| Parameter | Type                 |
| --------- | -------------------- |
| `dbKey`   | `symbol`             |
| `params`  | `ClaimNextJobParams` |

## Returns

`Promise`\<`ReturnsError`\<`null` \| \{ `attempt`: `number`; `authority`: [`JobAuthority`](../type-aliases/JobAuthority.md); `concurrency_key`: `null` \| `string`; `created_at`: `Date`; `dedupe_key`: `null` \| `string`; `enqueued_by_operation_id`: `string`; `finished_at`: `null` \| `Date`; `heartbeat_at`: `null` \| `Date`; `id`: `string`; `max_attempts`: `number`; `operation_id`: `string`; `original_request_id`: `string`; `parent_job_id`: `null` \| `string`; `priority`: `number`; `request`: [`JobRequest`](../interfaces/JobRequest.md); `result`: `null` \| [`JobResult`](../interfaces/JobResult.md); `run_at`: `Date`; `started_at`: `null` \| `Date`; `status`: `"pending"` \| `"running"` \| `"retrying"` \| `"succeeded"` \| `"dead"` \| `"cancelled"`; `updated_at`: `Date`; `user_id`: `string`; \}, `never`\>\>
