import { Request, Response } from "express";
import { AuthResponse } from "@saflib/auth-spec";
import { createHandler } from "@saflib/node-express";

// Define types using Drizzle's inferSelect
export const listUsersHandler = createHandler(
  async (req: Request, res: Response) => {
    // Fetch all users
    const users = await req.db.users.getAll();

    // Fetch corresponding email auth entries
    const userIds = users.map((u) => u.id);
    const emailAuths = await req.db.users.getEmailAuthByUserIds(userIds);

    // Create a map for quick email lookup
    const emailMap = new Map<number, string>();
    emailAuths.forEach((auth) => {
      emailMap.set(auth.userId, auth.email);
    });

    // Format the response according to the spec
    // Note: Spec requires email to be string, but emailAuth might be missing for a user?
    // Using a fallback string for now. Consider stricter error handling if needed.
    const responseBody = users
      .map((user) => ({
        id: user.id,
        createdAt: user.createdAt.toISOString(), // Convert to ISO string
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null, // Convert to ISO string if not null
        email:
          emailMap.get(user.id) ?? `Error: Email not found for user ${user.id}`,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Sort by ISO string

    res.json(responseBody satisfies AuthResponse["listUsers"]["200"]);
  },
);
