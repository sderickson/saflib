import { queryWrapper } from "@saflib/drizzle";
import type { SelectEmailAuth } from "../../types.ts";
import { emailAuth } from "../../schemas/index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
export const updateVerificationToken = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
    verificationToken: string,
    verificationTokenExpiresAt: Date,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
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
