import { emailAuth } from "../../schema.ts";
import { AuthDatabaseError } from "../../errors.ts";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../schema.ts";

export function createEmailAuthQueries(
  db: BetterSQLite3Database<typeof schema>,
) {




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
