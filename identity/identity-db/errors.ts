import { HandledDatabaseError } from "@saflib/drizzle";

export class IdentityDatabaseError extends HandledDatabaseError {}
export class EmailAuthNotFoundError extends IdentityDatabaseError {}
export class EmailTakenError extends IdentityDatabaseError {}
export class TokenNotFoundError extends IdentityDatabaseError {}
export class VerificationTokenNotFoundError extends IdentityDatabaseError {}
export class EmailConflictError extends IdentityDatabaseError {}
export class UserNotFoundError extends IdentityDatabaseError {}
