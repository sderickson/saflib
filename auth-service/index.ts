import { createApp } from "./src/app.ts";
import type { AuthApp, AuthConfig } from "./types.ts";

/**
 * Creates a fully configured Express application with authentication
 * All configuration is handled through environment variables:
 * - DOMAIN: The domain for cookies (e.g. "example.com")
 * - PROTOCOL: "http" or "https"
 * - NODE_ENV: "development" or "production"
 * - SESSION_SECRET: Secret for session encryption
 */
export function createAuthApp(): AuthApp {
  const config: AuthConfig = {
    domain: process.env.DOMAIN || "localhost",
    protocol: (process.env.PROTOCOL as "http" | "https") || "http",
    nodeEnv:
      (process.env.NODE_ENV as "development" | "production") || "development",
    sessionSecret: process.env.SESSION_SECRET || "your-secret-key",
  };

  return createApp(config);
}

export type { AuthApp, AuthConfig } from "./types.ts";
