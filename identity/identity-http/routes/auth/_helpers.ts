import { identityDb } from "@saflib/identity-db";
import { type User } from "../../types.ts";
import { type components } from "@saflib/identity-spec";
import type { DbKey } from "@saflib/drizzle-sqlite3";

// Helper function to get user scopes
export async function getUserScopes(
  dbKey: DbKey,
  userId: number,
): Promise<string[]> {
  const permissions = await identityDb.permissions.getByUserId(dbKey, userId);
  return permissions.map((p) => p.permission);
}

// Helper function to create user response
export async function createUserResponse(
  dbKey: DbKey,
  user: User,
): Promise<components["schemas"]["User"]> {
  const scopes = await getUserScopes(dbKey, user.id);
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified ?? false,
    name: user.name ?? undefined,
    givenName: user.givenName ?? undefined,
    familyName: user.familyName ?? undefined,
    scopes,
  };
}
