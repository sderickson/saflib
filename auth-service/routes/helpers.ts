import { AuthDB } from "@saflib/auth-db";
import { type User } from "../types.ts";
import { type components } from "@saflib/auth-spec";
import { vi } from "vitest";
import type { Response } from "supertest";
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

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
): Promise<components["schemas"]["UserResponse"]> {
  const scopes = await getUserScopes(db, user.id);
  return {
    id: user.id,
    email: user.email,
    scopes,
  };
}

export function getCsrfToken(res: Response): string {
  const setCookies = res.headers["set-cookie"] as unknown as string[];
  const csrfCookie = setCookies.find((cookie) =>
    cookie.startsWith("_csrf_token="),
  );
  const csrfToken = csrfCookie?.split(";")[0].split("=")[1] || "";
  return csrfToken;
}
