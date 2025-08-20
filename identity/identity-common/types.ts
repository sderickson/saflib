import type { User } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";

export interface AuthServiceCallbacks {
  onUserCreated?: (user: User) => Promise<void>;
  onVerificationTokenCreated?: (
    user: User,
    verificationUrl: string,
    isResend: boolean,
  ) => Promise<void>;
  onPasswordReset?: (user: User, resetUrl: string) => Promise<void>;
  onPasswordUpdated?: (user: User) => Promise<void>;
}

export interface AuthServerOptions {
  dbKey?: DbKey;
  callbacks: AuthServiceCallbacks;
}
