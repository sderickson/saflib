import type { Express } from "express";
import type { Session } from "express-session";
import type { User } from "@saflib/auth-db";

export interface AuthApp extends Express {
  // The app instance will have all auth middleware and routes configured
}

export interface AuthSession extends Session {
  passport?: {
    user: string; // User ID
  };
}

export interface AuthUser extends User {
  // Additional user properties specific to auth service
}

export interface AuthConfig {
  domain: string;
  protocol: "http" | "https";
  nodeEnv: "development" | "production";
  sessionSecret: string;
}
