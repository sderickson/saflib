import { emailAuth } from "../../schema.ts";
import { AuthDatabaseError } from "../../errors.ts";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../schema.ts";

export function createEmailAuthQueries(
  db: BetterSQLite3Database<typeof schema>,
) {
  return {
    updateForgotPasswordToken: queryWrapper(
      async (
        userId: number,
        forgotPasswordToken: string | null,
        forgotPasswordTokenExpiresAt: Date | null,
      ): Promise<SelectEmailAuth> => {
        const result = await db
          .update(emailAuth)
          .set({
            forgotPasswordToken,
            forgotPasswordTokenExpiresAt,
          })
          .where(eq(emailAuth.userId, userId))
          .returning();

        if (!result.length) {
          throw new EmailAuthNotFoundError();
        }
        return result[0];
      },
    ),

    updatePasswordHash: queryWrapper(
      async (
        userId: number,
        passwordHash: Uint8Array,
      ): Promise<SelectEmailAuth> => {
        const result = await db
          .update(emailAuth)
          .set({ passwordHash })
          .where(eq(emailAuth.userId, userId))
          .returning();

        if (!result.length) {
          throw new EmailAuthNotFoundError();
        }
        return result[0];
      },
    ),

    deleteAll: queryWrapper(async (): Promise<void> => {
      await db.delete(emailAuth).execute();
    }),

    getByForgotPasswordToken: queryWrapper(
      async (token: string): Promise<SelectEmailAuth> => {
        const result = await db.query.emailAuth.findFirst({
          where: eq(emailAuth.forgotPasswordToken, token),
        });
        if (!result) {
          throw new TokenNotFoundError();
        }
        return result;
      },
    ),

    updatePassword: queryWrapper(
      async (
        userId: number,
        passwordHash: Uint8Array,
      ): Promise<SelectEmailAuth> => {
        const result = await db
          .update(emailAuth)
          .set({ passwordHash })
          .where(eq(emailAuth.userId, userId))
          .returning();

        if (!result.length) {
          throw new EmailAuthNotFoundError();
        }
        return result[0];
      },
    ),

    clearForgotPasswordToken: queryWrapper(
      async (userId: number): Promise<SelectEmailAuth> => {
        const result = await db
          .update(emailAuth)
          .set({
            forgotPasswordToken: null,
            forgotPasswordTokenExpiresAt: null,
          })
          .where(eq(emailAuth.userId, userId))
          .returning();

        if (!result.length) {
          throw new EmailAuthNotFoundError();
        }
        return result[0];
      },
    ),

    verifyEmail: queryWrapper(
      async (userId: number): Promise<SelectEmailAuth> => {
        const result = await db
          .update(emailAuth)
          .set({
            verifiedAt: new Date(),
            verificationToken: null,
            verificationTokenExpiresAt: null,
          })
          .where(eq(emailAuth.userId, userId))
          .returning();

        if (!result.length) {
          throw new EmailAuthNotFoundError();
        }
        return result[0];
      },
    ),

    getByVerificationToken: queryWrapper(
      async (token: string): Promise<SelectEmailAuth> => {
        const result = await db.query.emailAuth.findFirst({
          where: eq(emailAuth.verificationToken, token),
        });
        if (!result) {
          throw new VerificationTokenNotFoundError();
        }
        return result;
      },
    ),

    updateVerificationToken: queryWrapper(
      async (
        userId: number,
        verificationToken: string,
        verificationTokenExpiresAt: Date,
      ): Promise<SelectEmailAuth> => {
        const result = await db
          .update(emailAuth)
          .set({
            verificationToken,
            verificationTokenExpiresAt,
          })
          .where(eq(emailAuth.userId, userId))
          .returning();

        if (!result.length) {
          throw new EmailAuthNotFoundError();
        }
        return result[0];
      },
    ),
  };
}
