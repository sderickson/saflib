import { HandledDatabaseError } from "@saflib/drizzle-sqlite3";

export class AuthDatabaseError extends HandledDatabaseError {}
export class EmailAuthNotFoundError extends AuthDatabaseError {}
export class TokenNotFoundError extends AuthDatabaseError {}
export class VerificationTokenNotFoundError extends AuthDatabaseError {}
export class EmailConflictError extends AuthDatabaseError {}
export class UserNotFoundError extends AuthDatabaseError {}