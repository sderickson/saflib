import { mockingOn } from "@saflib/email";
import { getSafReporters } from "@saflib/node";
import type { IdentityServiceCallbacks } from "@saflib/identity";
import type {
  VerificationTokenCreatedPayload,
  PasswordResetPayload,
  PasswordUpdatedPayload,
} from "@saflib/identity-common";
async function onVerificationTokenCreated(
  payload: VerificationTokenCreatedPayload,
) {
  const { log } = getSafReporters();
  const { user, verificationUrl } = payload;
  // TODO: Implement verification email sending
  log.info(`Verification email should be sent to ${user.id}`);
  if (mockingOn) {
    log.info(`Link: ${verificationUrl}`);
  }
}

async function onPasswordReset(payload: PasswordResetPayload) {
  const { log } = getSafReporters();
  const { user, resetUrl } = payload;
  // TODO: Implement password reset email sending
  log.info(`Password reset email should be sent to ${user.id}`);
  if (mockingOn) {
    log.info(`Link: ${resetUrl}`);
  }
}

async function onPasswordUpdated(payload: PasswordUpdatedPayload) {
  const { log } = getSafReporters();
  const { user } = payload;
  // TODO: Implement password update confirmation email sending
  log.info(`Password update confirmation email should be sent to ${user.id}`);
}

export const callbacks: IdentityServiceCallbacks = {
  onVerificationTokenCreated,
  onPasswordReset,
  onPasswordUpdated,
};
