import { AuthDB } from "@saflib/auth-db";
import { type User } from "../types.ts";
import { type AuthResponse } from "@saflib/auth-spec";

// Helper function to get user scopes
export async function getUserScopes(
  db: AuthDB,
  userId: number,
): Promise<string[]> {
  const permissions = await db.permissions.getByUserId(userId);
  return permissions.map((p) => p.permission);
}

// Helper function to create user response
export async function createUserResponse(
  db: AuthDB,
  user: User,
): Promise<AuthResponse["verifyAuth"][200]> {
  const scopes = await getUserScopes(db, user.id);
  return {
    id: user.id,
    email: user.email,
    scopes,
  };
}
