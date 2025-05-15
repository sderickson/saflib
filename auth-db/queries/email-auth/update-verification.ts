import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { emailAuth } from "../../schema.ts";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { SelectEmailAuth } from "../../types.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
export const updateVerification = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
    verificationToken: string | null,
    verificationTokenExpiresAt: Date | null,
    verifiedAt: Date | null,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = authDbManager.get(dbKey)!;
    const result = await db
      .update(emailAuth)
      .set({
        verificationToken,
        verificationTokenExpiresAt,
        verifiedAt,
      })
      .where(eq(emailAuth.userId, userId))
      .returning();

    if (!result.length) {
      return { error: new EmailAuthNotFoundError() };
    }
    return { result: result[0] };
  },
);
