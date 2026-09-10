[**@saflib/jobs-db**](../../index.md)

---

# Variable: getByIdJob()

> `const` **getByIdJob**: (`dbKey`, `params`) => `Promise`\<`ReturnsError`\<\{ `attempt`: `number`; `authority`: [`JobAuthority`](../type-aliases/JobAuthority.md); `concurrency_key`: `null` \| `string`; `created_at`: `Date`; `dedupe_key`: `null` \| `string`; `enqueued_by_operation_id`: `string`; `finished_at`: `null` \| `Date`; `heartbeat_at`: `null` \| `Date`; `id`: `string`; `max_attempts`: `number`; `operation_id`: `string`; `original_request_id`: `string`; `parent_job_id`: `null` \| `string`; `priority`: `number`; `request`: [`JobRequest`](../interfaces/JobRequest.md); `result`: `null` \| [`JobResult`](../interfaces/JobResult.md); `run_at`: `Date`; `started_at`: `null` \| `Date`; `status`: `"pending"` \| `"running"` \| `"retrying"` \| `"succeeded"` \| `"dead"` \| `"cancelled"`; `updated_at`: `Date`; `user_id`: `string`; \}, [`JobNotFoundError`](../../errors/classes/JobNotFoundError.md)>>\>\>

## Parameters

| Parameter | Type               |
| --------- | ------------------ |
| `dbKey`   | `symbol`           |
| `params`  | `GetByIdJobParams` |

## Returns

`Promise`\<`ReturnsError`\<\{ `attempt`: `number`; `authority`: [`JobAuthority`](../type-aliases/JobAuthority.md); `concurrency_key`: `null` \| `string`; `created_at`: `Date`; `dedupe_key`: `null` \| `string`; `enqueued_by_operation_id`: `string`; `finished_at`: `null` \| `Date`; `heartbeat_at`: `null` \| `Date`; `id`: `string`; `max_attempts`: `number`; `operation_id`: `string`; `original_request_id`: `string`; `parent_job_id`: `null` \| `string`; `priority`: `number`; `request`: [`JobRequest`](../interfaces/JobRequest.md); `result`: `null` \| [`JobResult`](../interfaces/JobResult.md); `run_at`: `Date`; `started_at`: `null` \| `Date`; `status`: `"pending"` \| `"running"` \| `"retrying"` \| `"succeeded"` \| `"dead"` \| `"cancelled"`; `updated_at`: `Date`; `user_id`: `string`; \}, [`JobNotFoundError`](../../errors/classes/JobNotFoundError.md)\>\>
