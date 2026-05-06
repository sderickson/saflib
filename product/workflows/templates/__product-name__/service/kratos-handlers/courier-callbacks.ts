import { getSafReporters } from "@saflib/node";
import type {
  KratosCourierCallbacks,
  RecoveryCodeValidPayload,
  VerificationCodeValidPayload,
} from "@saflib/ory-kratos";

async function onVerificationCodeValid(payload: VerificationCodeValidPayload) {
  const { log } = getSafReporters();
  const { user, verificationUrl } = payload;
  log.info(`Verification code email for ${user.id}: ${verificationUrl}`);
}

async function onRecoveryCodeValid(payload: RecoveryCodeValidPayload) {
  const { log } = getSafReporters();
  const { user, recoveryCode } = payload;
  log.info(`Recovery code email for ${user.id}: ${recoveryCode}`);
}

export const courierCallbacks: KratosCourierCallbacks = {
  onVerificationCodeValid,
  onRecoveryCodeValid,
};

/** @deprecated Use {@link courierCallbacks} instead. */
export const callbacks = courierCallbacks;
