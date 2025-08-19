import { HandledDatabaseError } from "@saflib/drizzle-sqlite3";

/**
 * Superclass for all handled cron db errors
 */
export class CronDatabaseError extends HandledDatabaseError {}

export class JobSettingNotFoundError extends CronDatabaseError {}
