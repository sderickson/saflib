/**
 * Authentication Service Application
 *
 * Handles user authentication and session management for the SAF architecture.
 * Implements common middleware patterns and specific auth-related functionality.
 */

import { AuthDB } from "@saflib/auth-db";
import { recommendedErrorHandlers } from "@saflib/node-express";
import express from "express";
import { makeRouter } from "./routes/auth/index.ts";

// Define properties added to Express Request objects by middleware
declare global {
  namespace Express {
    interface Request {
      db: AuthDB;
      isValidCsrfToken: () => boolean;
    }
  }
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.set(
    "saf:admin emails",
    new Set(process.env.ADMIN_EMAILS?.split(",") || []),
  );

  // Initialize database
  const db = new AuthDB();

  // db injection
  app.use((req, _, next) => {
    req.db = db;
    next();
  });

  /**
   * Routes
   * Authentication related endpoints
   */
  app.use(makeRouter(db));

  // Apply recommended error handlers
  app.use(recommendedErrorHandlers);

  return app;
}
