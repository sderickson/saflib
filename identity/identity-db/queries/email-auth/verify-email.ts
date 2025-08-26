import { type DbKey, queryWrapper } from "@saflib/drizzle";
import { emailAuth, users } from "../../schemas/index.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { identityDbManager } from "../../instances.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { SelectEmailAuth } from "../../types.ts";

export const verifyEmail = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
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

    await db
      .update(users)
      .set({
        emailVerified: true,
        email: result[0].email,
      })
      .where(eq(users.id, userId));

    return { result: result[0] };
  },
);
