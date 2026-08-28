import { getSafReporters } from "@saflib/node";
import { passwordReset } from "@saflib/base-email/password-reset";
import { verifyEmail } from "@saflib/base-email/verify-email";
import { getEmailClient } from "@saflib/base-service-common/dependencies";
import type {
  KratosCourierCallbacks,
  RecoveryCodeValidPayload,
  VerificationCodeValidPayload,
} from "@saflib/ory-kratos";

const emailFrom = "Base <noreply@saflib.com>";

async function onVerificationCodeValid(payload: VerificationCodeValidPayload) {
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

async function onRecoveryCodeValid(payload: RecoveryCodeValidPayload) {
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

export const courierCallbacks: KratosCourierCallbacks = {
  onVerificationCodeValid,
  onRecoveryCodeValid,
};

/** @deprecated Use {@link courierCallbacks} instead. */
export const callbacks = courierCallbacks;
