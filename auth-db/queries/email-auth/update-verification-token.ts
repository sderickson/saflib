import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { SelectEmailAuth } from "../../types.ts";
import { emailAuth } from "../../schema.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
export const updateVerificationToken = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
    verificationToken: string,
    verificationTokenExpiresAt: Date,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = authDbManager.get(dbKey)!;
    const result = await db
      .update(emailAuth)
      .set({
        verificationToken,
        verificationTokenExpiresAt,
      })
      .where(eq(emailAuth.userId, userId))
      .returning();

    if (!result.length) {
      return { error: new EmailAuthNotFoundError() };
    }
    return { result: result[0] };
  },
);
