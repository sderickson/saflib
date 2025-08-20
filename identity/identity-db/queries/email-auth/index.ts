import { create } from "./create.ts";
import { getByEmail } from "./get-by-email.ts";
import { updateForgotPasswordToken } from "./update-forgot-password-token.ts";
import { updatePasswordHash } from "./update-password-hash.ts";
import { getByForgotPasswordToken } from "./get-by-forgot-password-token.ts";
import { updatePassword } from "./update-password.ts";
import { clearForgotPasswordToken } from "./clear-forgot-password-token.ts";
import { verifyEmail } from "./verify-email.ts";
import { getByVerificationToken } from "./get-by-verification-token.ts";
import { updateVerificationToken } from "./update-verification-token.ts";
import { getEmailAuthByUserIds } from "./get-by-user-ids.ts";
import { updateEmail, type UpdateEmailResult } from "./update-email.ts";

export const emailAuthDb = {
  create,
  getByEmail,
  updateForgotPasswordToken,
  updatePasswordHash,
  getByForgotPasswordToken,
  updatePassword,
  clearForgotPasswordToken,
  verifyEmail,
  getByVerificationToken,
  updateVerificationToken,
  getEmailAuthByUserIds,
  updateEmail,
};
export type { UpdateEmailResult };
