import { type User } from "../../types.ts";
import { type components } from "@saflib/identity-spec";
import type { DbKey } from "@saflib/drizzle-sqlite3";

// Helper function to create user response
export async function createUserResponse(
  _dbKey: DbKey,
  user: User,
): Promise<components["schemas"]["User"]> {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified ?? false,
    name: user.name ?? undefined,
    givenName: user.givenName ?? undefined,
    familyName: user.familyName ?? undefined,
  };
}
