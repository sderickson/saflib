import { createApp } from "@saflib/node-express";
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
  const app = createApp() as AuthApp;

  // TODO: Configure all necessary middleware
  // TODO: Set up session handling
  // TODO: Configure passport with local strategy
  // TODO: Set up all auth routes
  // TODO: Configure error handling

  return app;
}

export type { AuthApp, AuthConfig } from "./types.ts";
