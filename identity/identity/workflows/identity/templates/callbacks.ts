import type { User } from "@saflib/identity";
import { emailClient, mockingOn } from "@saflib/email";
import { getSafReporters } from "@saflib/node";
import type { IdentityServiceCallbacks } from "@saflib/identity";

async function onVerificationTokenCreated(
  user: User,
  verificationUrl: string,
  isResend: boolean,
) {
  const { log } = getSafReporters();
  // TODO: Implement verification email sending
  log.info(`Verification email should be sent to ${user.id}`);
  if (mockingOn) {
    log.info(`Link: ${verificationUrl}`);
  }
}

async function onPasswordReset(user: User, resetUrl: string) {
  const { log } = getSafReporters();
  // TODO: Implement password reset email sending
  log.info(`Password reset email should be sent to ${user.id}`);
  if (mockingOn) {
    log.info(`Link: ${resetUrl}`);
  }
}

async function onPasswordUpdated(user: User) {
  const { log } = getSafReporters();
  // TODO: Implement password update confirmation email sending
  log.info(`Password update confirmation email should be sent to ${user.id}`);
}

export const callbacks: IdentityServiceCallbacks = {
  onVerificationTokenCreated,
  onPasswordReset,
  onPasswordUpdated,
};
