import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled jobs db errors
 */
export class JobsDatabaseError extends HandledDatabaseError {}

/** Enqueue rejected because the original-request spawn cap was reached. */
export class JobSpawnCapExceededError extends JobsDatabaseError {}

/** No job row exists for the given id. */
export class JobNotFoundError extends JobsDatabaseError {}

/** The job exists but is not in `running` status. */
export class JobNotRunningError extends JobsDatabaseError {}

/** Cancel rejected because the job is running or already terminal. */
export class JobNotCancellableError extends JobsDatabaseError {}

/** Retry rejected because the job is not dead or cancelled. */
export class JobNotRetryableError extends JobsDatabaseError {}
