import type { Express } from "express";

export interface AuthApp extends Express {
  // The app instance will have all auth middleware and routes configured
}

export interface AuthConfig {
  domain: string;
  protocol: "http" | "https";
  nodeEnv: "development" | "production";
  sessionSecret: string;
}

import type { User as DbUser } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";

// Extend Express.User
declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

export type User = Express.User;

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
