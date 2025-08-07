import { HandledDatabaseError } from "@saflib/drizzle-sqlite3";

export class CronDatabaseError extends HandledDatabaseError {
  constructor(message: string) {
    super(message);
    this.name = "CronDatabaseError";
  }
}

export class JobSettingNotFoundError extends CronDatabaseError {
  constructor(jobName: string) {
    super(`Job setting for job name '${jobName}' not found`);
    this.name = "JobSettingNotFoundError";
  }
}
