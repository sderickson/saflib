import { getSafReporters } from "@saflib/node";
import { verifyEmail } from "@saflib/base-email/emails/verify-email";
import { getEmailClient } from "@saflib/base-service-common/dependencies";
import type { VerificationCodeValidPayload } from "@saflib/ory-kratos-http";

const emailFrom = "Base <noreply@saflib.com>";

export async function onVerificationCodeValid(
  payload: VerificationCodeValidPayload,
): Promise<void> {
  const { log } = getSafReporters();
  const { user, verificationUrl, verificationCode, expiresInMinutes } = payload;
  if (process.env.NODE_ENV === "development") {
    log.info(`Verification code for ${user.email}: ${verificationCode}`);
    if (verificationUrl) {
      log.info(`Verification URL: ${verificationUrl}`);
    }
  }

  const { subject, html } = verifyEmail({
    verificationCode,
    verificationUrl,
    expiresInMinutes,
  });

  await getEmailClient().sendEmail({
    from: emailFrom,
    to: user.email,
    subject,
    html,
    text: verificationUrl
      ? `Your verification code is ${verificationCode}. Or verify here: ${verificationUrl}`
      : `Your verification code is ${verificationCode}.`,
  });
}
