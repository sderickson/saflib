import type { User } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle";

export interface UserCreatedPayload {
  user: User;
}

export interface VerificationTokenCreatedPayload {
  user: User;
  verificationUrl: string;
  isResend: boolean;
}

export interface UserVerifiedPayload {
  user: User;
}

export interface PasswordResetPayload {
  user: User;
  resetUrl: string;
}

export interface PasswordUpdatedPayload {
  user: User;
}

/**
 * Callbacks for events which occur in the identity service.
 * This is the main way to hook into the identity service.
 */
export interface IdentityServiceCallbacks {
  onUserCreated?: (payload: UserCreatedPayload) => Promise<void>;
  onUserVerified?: (payload: UserVerifiedPayload) => Promise<void>;
  onVerificationTokenCreated?: (
    payload: VerificationTokenCreatedPayload,
  ) => Promise<void>;
  onPasswordReset?: (payload: PasswordResetPayload) => Promise<void>;
  onPasswordUpdated?: (payload: PasswordUpdatedPayload) => Promise<void>;
}

/**
 * Options for the identity service.
 */
export interface IdentityServerOptions {
  dbKey?: DbKey;
  callbacks: IdentityServiceCallbacks;
}
