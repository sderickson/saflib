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

import type { SelectUser as DbUser } from "@saflib/auth-db";

// Extend Express.User
declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

export type User = Express.User;
