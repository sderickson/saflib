import { emailAuth } from "../../schema.ts";
import { AuthDatabaseError } from "../../errors.ts";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../schema.ts";

export function createEmailAuthQueries(
  db: BetterSQLite3Database<typeof schema>,
) {



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
