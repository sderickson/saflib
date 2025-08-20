import { type DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import { emailAuth, users } from "../../schemas/index.ts";
import type { SelectEmailAuth } from "../../types.ts";
import { EmailAuthNotFoundError, EmailTakenError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { identityDbManager } from "../../instances.ts";

type UpdateEmailResult = {
  emailAuth: SelectEmailAuth;
};

export const updateEmail = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
    newEmail: string,
  ): Promise<
    ReturnsError<UpdateEmailResult, EmailAuthNotFoundError | EmailTakenError>
  > => {
    const db = identityDbManager.get(dbKey)!;

    const existingEmailAuth = await db.query.emailAuth.findFirst({
      where: eq(emailAuth.email, newEmail),
    });
    if (existingEmailAuth) {
      return { error: new EmailTakenError() };
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, newEmail),
    });
    if (existingUser) {
      return { error: new EmailTakenError() };
    }

    // Update email_auth table: set new email and clear verification data
    const emailAuthResult = await db
      .update(emailAuth)
      .set({
        email: newEmail,
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      })
      .where(eq(emailAuth.userId, userId))
      .returning();

    if (!emailAuthResult.length) {
      return { error: new EmailAuthNotFoundError() };
    }

    // Update users table: set new email and mark as unverified
    await db
      .update(users)
      .set({
        email: newEmail,
        emailVerified: false,
      })
      .where(eq(users.id, userId));

    return { result: { emailAuth: emailAuthResult[0] } };
  },
);
