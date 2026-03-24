/**
 * Copied from @saflib/identity-common (pending removal of identity packages).
 * Payload `user` uses a minimal shape suitable for Kratos courier events.
 */

export interface User {
  id: string;
  email: string;
  createdAt?: Date;
  lastLoginAt?: Date | null;
  /** Aligns with legacy identity-db `users` row typing where applicable. */
  emailVerified?: boolean | null;
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
}

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
 * Callbacks for events which occur in the auth/courier flow.
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
