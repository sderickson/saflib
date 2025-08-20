import type { AuthResponseBody } from "@saflib/identity-spec";
import { createHandler } from "@saflib/express";
import { emailAuthDb, usersDb } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
// Define types using Drizzle's inferSelect
export const listUsersHandler = createHandler(async (_, res) => {
  const { dbKey } = authServiceStorage.getStore()!;
  const users = await usersDb.getAll(dbKey);

  const userIds = users.map((u) => u.id);
  const emailAuths = await emailAuthDb.getEmailAuthByUserIds(dbKey, userIds);

  const emailMap = new Map<number, string>();
  emailAuths.forEach((auth) => {
    emailMap.set(auth.userId, auth.email);
  });

  const responseBody = users
    .map((user) => ({
      id: user.id,
      createdAt: user.createdAt.toISOString(), // Convert to ISO string
      lastLoginAt: user.lastLoginAt?.toISOString() ?? undefined, // Convert to ISO string if not null
      email:
        emailMap.get(user.id) ?? `Error: Email not found for user ${user.id}`,
      verifiedAt:
        emailAuths
          .find((auth) => auth.userId === user.id)
          ?.verifiedAt?.toISOString() ?? undefined,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Sort by ISO string

  res.json(responseBody satisfies AuthResponseBody["listUsers"]["200"]);
});
