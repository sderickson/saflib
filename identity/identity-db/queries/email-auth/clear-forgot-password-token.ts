import { type DbKey, queryWrapper } from "@saflib/drizzle";
import { emailAuth } from "../../schemas/index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { SelectEmailAuth } from "../../types.ts";
import { identityDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

export const clearForgotPasswordToken = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db
      .update(emailAuth)
      .set({
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      })
      .where(eq(emailAuth.userId, userId))
      .returning();

    if (!result.length) {
      return { error: new EmailAuthNotFoundError() };
    }
    return { result: result[0] };
  },
);
