[**@saflib/jobs-db**](../index.md)

---

# index

## Interfaces

| Interface                                                    | Description                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [JobAuthorityAssertion](interfaces/JobAuthorityAssertion.md) | Enqueue-hop identity assertion stored with the authority grant.                 |
| [JobEntity](interfaces/JobEntity.md)                         | -                                                                               |
| [JobRequest](interfaces/JobRequest.md)                       | Capped request payload delivered to the target operation (≤ 16 KB serialized).  |
| [JobResult](interfaces/JobResult.md)                         | Outcome of a terminal or failed attempt; `error_body` only on failure (≤ 8 KB). |

## Type Aliases

| Type Alias                                             | Description                                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [JobAuthority](type-aliases/JobAuthority.md)           | Root grant for the job chain, including the embedded enqueue assertion. Wire form omits `assertion` (returned separately as `authority_assertion`). |
| [JobEntityTest](type-aliases/JobEntityTest.md)         | -                                                                                                                                                   |
| [JobStatus](type-aliases/JobStatus.md)                 | -                                                                                                                                                   |
| [JobTerminalReason](type-aliases/JobTerminalReason.md) | -                                                                                                                                                   |

## Variables

| Variable                                                                  | Description                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [cancelByIdJob](variables/cancelByIdJob.md)                               | Cancel a pending/retrying job (`terminal_reason: cancelled-by-admin`). Running and terminal jobs return `JobNotCancellableError`.                                            |
| [cancelByOriginalRequestIdJob](variables/cancelByOriginalRequestIdJob.md) | Cancel every pending/retrying job in a chain (`terminal_reason: cancelled-by-chain`). Running and terminal jobs are left alone. Returns the cancelled rows (possibly empty). |
| [claimNextJob](variables/claimNextJob.md)                                 | Atomically claim the highest-priority eligible job.                                                                                                                          |
| [countByOriginalRequestIdJob](variables/countByOriginalRequestIdJob.md)   | Count all jobs sharing an `original_request_id` (spawn-cap / lineage).                                                                                                       |
| [countByStatusJob](variables/countByStatusJob.md)                         | Counts of jobs grouped by status (for the `jobs_queue_depth` gauge). Statuses with zero jobs are omitted.                                                                    |
| [createJob](variables/createJob.md)                                       | -                                                                                                                                                                            |
| [deleteExpiredTerminalJob](variables/deleteExpiredTerminalJob.md)         | Retention sweep: delete terminal jobs older than `cutoff`. Returns the number of rows deleted.                                                                               |
| [getByIdJob](variables/getByIdJob.md)                                     | -                                                                                                                                                                            |
| [heartbeatJob](variables/heartbeatJob.md)                                 | Refresh `heartbeat_at` for a running job (stall detection).                                                                                                                  |
| [jobsDb](variables/jobsDb.md)                                             | -                                                                                                                                                                            |
| [jobTable](variables/jobTable.md)                                         | -                                                                                                                                                                            |
| [listJob](variables/listJob.md)                                           | List jobs with optional filters, newest first (`created_at` desc, then `id`).                                                                                                |
| [listRunningJobsJob](variables/listRunningJobsJob.md)                     | Returns all jobs currently in `running` status (for stall detection).                                                                                                        |
| [recordAttemptResultJob](variables/recordAttemptResultJob.md)             | Record a delivery attempt outcome. Only transitions from `running`.                                                                                                          |
| [recoverStalledJob](variables/recoverStalledJob.md)                       | Recover stalled deliveries: running jobs in `ids` become `retrying` if attempts remain, else `dead` with `terminal_reason: exhausted`. Returns the affected rows.            |
| [retryByIdJob](variables/retryByIdJob.md)                                 | Re-queue a dead/cancelled job as pending with a full attempt reset. Other statuses return `JobNotRetryableError` (409-style).                                                |

## References

### JobNotCancellableError

Re-exports [JobNotCancellableError](../errors/classes/JobNotCancellableError.md)

---

### JobNotFoundError

Re-exports [JobNotFoundError](../errors/classes/JobNotFoundError.md)

---

### JobNotRetryableError

Re-exports [JobNotRetryableError](../errors/classes/JobNotRetryableError.md)

---

### JobNotRunningError

Re-exports [JobNotRunningError](../errors/classes/JobNotRunningError.md)

---

### JobsDatabaseError

Re-exports [JobsDatabaseError](../errors/classes/JobsDatabaseError.md)

---

### JobSpawnCapExceededError

Re-exports [JobSpawnCapExceededError](../errors/classes/JobSpawnCapExceededError.md)
