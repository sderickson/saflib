import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for handled __offshoot-name__ db errors.
 * Migrations / DbManager live on the parent db package; this package exports schema only.
 */
export class Base__OffshootName__DatabaseError extends HandledDatabaseError {}

export class StubError extends Base__OffshootName__DatabaseError {}
