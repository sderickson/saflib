import type { User } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";

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

export interface IdentityServerOptions {
  dbKey?: DbKey;
  callbacks: IdentityServiceCallbacks;
}
