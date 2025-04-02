import { AuthDB } from "@saflib/auth-db";
import { User } from "../types.ts";
import { UserResponse } from "@saflib/auth-spec";

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
): Promise<UserResponse> {
  const scopes = await getUserScopes(db, user.id);
  return {
    id: user.id,
    email: user.email,
    scopes,
  };
}
