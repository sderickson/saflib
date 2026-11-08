import { HandledDatabaseError } from "@saflib/drizzle";

export class IssuesDatabaseError extends HandledDatabaseError {}

/** No issue with that id. */
export class IssueNotFoundError extends IssuesDatabaseError {}
