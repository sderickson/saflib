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

// Extend Express.User
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      createdAt: Date;
      lastLoginAt: Date | null;
    }
  }
}

export type User = Express.User;
