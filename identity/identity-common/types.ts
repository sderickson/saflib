import type { User } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";

/**
 * Callbacks for events which occur in the identity service.
 * This is the main way to hook into the identity service.
 */
export interface IdentityServiceCallbacks {
  onUserCreated?: (user: User) => Promise<void>;
  onVerificationTokenCreated?: (
    user: User,
    verificationUrl: string,
    isResend: boolean,
  ) => Promise<void>;
  onPasswordReset?: (user: User, resetUrl: string) => Promise<void>;
  onPasswordUpdated?: (user: User) => Promise<void>;
}

/**
 * Options for the identity service.
 */
export interface IdentityServerOptions {
  dbKey?: DbKey;
  callbacks: IdentityServiceCallbacks;
}
