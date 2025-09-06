import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled template-file db errors
 */
export class TemplateFileDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class TemplateFileNotFoundError extends TemplateFileDatabaseError {}
