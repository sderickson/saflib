import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled new-workflows db errors
 */
export class NewWorkflowsDatabaseError extends HandledDatabaseError {}

/** No run row exists for the given id. */
export class WorkflowRunNotFoundError extends NewWorkflowsDatabaseError {}

/** No step row exists for the given id. */
export class WorkflowStepNotFoundError extends NewWorkflowsDatabaseError {}

/** No config row exists for the given id. */
export class WorkflowConfigNotFoundError extends NewWorkflowsDatabaseError {}
