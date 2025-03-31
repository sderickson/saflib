import { users } from "../schema.ts";
import { AuthDatabaseError } from "../errors.ts";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema.ts";

type NewUser = typeof users.$inferInsert;
type SelectUser = typeof users.$inferSelect;

export class EmailConflictError extends AuthDatabaseError {
  constructor() {
    super("That email is taken.");
    this.name = "EmailConflictError";
  }
}

export class UserNotFoundError extends AuthDatabaseError {
  constructor() {
    super("User not found.");
    this.name = "UserNotFoundError";
  }
}

export function createUserQueries(db: BetterSQLite3Database<typeof schema>) {
  return {
    UserNotFoundError,
    EmailConflictError,
    create: queryWrapper(async (user: NewUser): Promise<SelectUser> => {
      try {
        const now = new Date();
        const result = await db
          .insert(users)
          .values({ ...user, createdAt: now })
          .returning();
        return result[0];
      } catch (e: unknown) {
        if (
          e instanceof Error &&
          e.message.includes("UNIQUE constraint failed: users.email")
        ) {
          throw new EmailConflictError();
        }
        throw e;
      }
    }),

    getAll: queryWrapper(async (): Promise<SelectUser[]> => {
      return db.query.users.findMany().execute();
    }),

    getByEmail: queryWrapper(async (email: string): Promise<SelectUser> => {
      const result = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (!result) {
        throw new UserNotFoundError();
      }
      return result;
    }),

    getById: queryWrapper(async (id: number): Promise<SelectUser> => {
      const result = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!result) {
        throw new UserNotFoundError();
      }
      return result;
    }),

    updateLastLogin: queryWrapper(async (id: number): Promise<SelectUser> => {
      const now = new Date();
      const result = await db
        .update(users)
        .set({ lastLoginAt: now })
        .where(eq(users.id, id))
        .returning();

      if (!result.length) {
        throw new UserNotFoundError();
      }
      return result[0];
    }),

    deleteAll: queryWrapper(async (): Promise<void> => {
      await db.delete(users).execute();
    }),
  };
}
