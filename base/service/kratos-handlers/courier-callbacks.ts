import { getSafReporters } from "@saflib/node";
import type {
  KratosCourierCallbacks,
  RecoveryCodeValidPayload,
  VerificationCodeValidPayload,
} from "@saflib/ory-kratos";

// TODO: Add an email service integration and send emails here.

async function onVerificationCodeValid(payload: VerificationCodeValidPayload) {
  const { log } = getSafReporters();
  const { user, verificationUrl, verificationCode } = payload;
  if (process.env.NODE_ENV === "development") {
    log.info(`Verification code for ${user.email}: ${verificationCode}`);
    log.info(`Verification URL:`);
    log.info(verificationUrl);
  }
}

async function onRecoveryCodeValid(payload: RecoveryCodeValidPayload) {
  const { log } = getSafReporters();
  const { user, recoveryCode } = payload;
  if (process.env.NODE_ENV === "development") {
    log.info(`Recovery code for ${user.email}: ${recoveryCode}`);
  }
}

export const courierCallbacks: KratosCourierCallbacks = {
  onVerificationCodeValid,
  onRecoveryCodeValid,
};

/** @deprecated Use {@link courierCallbacks} instead. */
export const callbacks = courierCallbacks;
