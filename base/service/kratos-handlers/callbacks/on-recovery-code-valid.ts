import { getSafReporters } from "@saflib/node";
import { passwordReset } from "@saflib/base-email/emails/password-reset";
import { getEmailClient } from "@saflib/base-service-common/dependencies";
import type { RecoveryCodeValidPayload } from "@saflib/ory-kratos-http";

const emailFrom = "Base <noreply@saflib.com>";

export async function onRecoveryCodeValid(
  payload: RecoveryCodeValidPayload,
): Promise<void> {
  const { log } = getSafReporters();
  const { user, recoveryCode, expiresInMinutes } = payload;
  if (process.env.NODE_ENV === "development") {
    log.info(`Recovery code for ${user.email}: ${recoveryCode}`);
  }

  const { subject, html } = passwordReset({
    recoveryCode,
    expiresInMinutes,
  });

  await getEmailClient().sendEmail({
    from: emailFrom,
    to: user.email,
    subject,
    html,
    text: `Your recovery code is ${recoveryCode}.`,
  });
}
