import { DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import { emailAuth } from "../../schema.ts";
import { ReturnsError } from "@saflib/monorepo";
import { authDbManager } from "../../instances.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { SelectEmailAuth } from "../../types.ts";

export const verifyEmail = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = authDbManager.get(dbKey)!;
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
      return { error: new EmailAuthNotFoundError() };
    }
    return { result: result[0] };
  },
);
