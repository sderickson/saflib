/**
 * Authentication Service Application
 *
 * Handles user authentication and session management for the SAF architecture.
 * Implements common middleware patterns and specific auth-related functionality.
 */

import { AuthDB } from "@saflib/auth-db";
import {
  createPreMiddleware,
  recommendedErrorHandlers,
} from "@saflib/node-express";
import express from "express";
import passport from "passport";
import { setupPassport } from "./passport.ts";
import { authRouter } from "./routes/index.ts";
import { makeSessionMiddleware } from "./session-store.ts";
import { jsonSpec } from "@saflib/auth-spec";
import * as cookieParser from "cookie-parser";
import { csrfDSC } from "./csrf.ts";

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
  app.set("trust proxy", true);

  app.set(
    "saf:admin emails",
    new Set(process.env.ADMIN_EMAILS?.split(",") || []),
  );

  // Initialize database
  const db = new AuthDB();

  // Apply recommended middleware
  app.use(
    createPreMiddleware({
      apiSpec: jsonSpec,
      parseAuthHeaders: false,
    }),
  );

  app.use(cookieParser.default());

  const csrfProtection = csrfDSC({
    cookie: {
      domain: `.${process.env.DOMAIN}`,
      secure: process.env.PROTOCOL === "https",
    },
  });
  app.use(csrfProtection);
  app.use(makeSessionMiddleware());
  // app.use("/auth/verify", csrfProtection.validate);

  // Initialize Passport and restore authentication state from session
  setupPassport(db);
  app.use(passport.initialize());
  app.use(passport.session());

  // db injection
  app.use((req, _, next) => {
    req.db = db;
    next();
  });

  /**
   * Routes
   * Authentication related endpoints
   */
  app.use(authRouter);

  // Apply recommended error handlers
  app.use(recommendedErrorHandlers);

  return app;
}
