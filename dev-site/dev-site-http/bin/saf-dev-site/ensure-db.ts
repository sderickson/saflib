import {
  assertCliMayOpenDb,
  type CliDbAccess,
  DbInUseError,
} from "./defaults.ts";

/**
 * For write commands (scan): exit 1 if another process holds the DB.
 * For read commands (issues/show/diff): always allowed — connect with readonly.
 */
export function ensureCliDbAvailable(
  dbPath: string | true,
  access: CliDbAccess = "write",
): void {
  try {
    assertCliMayOpenDb(dbPath, access);
  } catch (e) {
    if (e instanceof DbInUseError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }
}
