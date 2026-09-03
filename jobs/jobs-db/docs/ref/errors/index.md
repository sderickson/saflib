[**@saflib/jobs-db**](../index.md)

---

# errors

## Classes

| Class                                                           | Description                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| [JobNotCancellableError](classes/JobNotCancellableError.md)     | Cancel rejected because the job is running or already terminal.      |
| [JobNotFoundError](classes/JobNotFoundError.md)                 | No job row exists for the given id.                                  |
| [JobNotRetryableError](classes/JobNotRetryableError.md)         | Retry rejected because the job is not dead or cancelled.             |
| [JobNotRunningError](classes/JobNotRunningError.md)             | The job exists but is not in `running` status.                       |
| [JobsDatabaseError](classes/JobsDatabaseError.md)               | Superclass for all handled jobs db errors                            |
| [JobSpawnCapExceededError](classes/JobSpawnCapExceededError.md) | Enqueue rejected because the original-request spawn cap was reached. |
