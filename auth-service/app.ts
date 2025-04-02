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
import session from "express-session";
import passport from "passport";
import { setupPassport } from "./passport.ts";
import { authRouter } from "./routes/index.ts";
import { sessionStore } from "./session-store.ts";
import { jsonSpec } from "@saflib/auth-spec";

// Define properties added to Express Request objects by middleware
declare global {
  namespace Express {
    interface Request {
      db: AuthDB;
    }
  }
}

export function createApp() {
  const app = express();
  app.set("trust proxy", true);

  // Initialize database
  const db = new AuthDB();

  // Apply recommended middleware
  app.use(
    createPreMiddleware({
      apiSpec: jsonSpec,
      parseAuthHeaders: false,
    }),
  );

  // Session configuration
  const cookie = {
    secure: process.env.PROTOCOL === "https",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "strict" as const,
    domain: `.${process.env.DOMAIN}`, // Allow cookies to be shared across subdomains
  };

  const sessionOptions = {
    store: process.env.NODE_ENV === "test" ? undefined : sessionStore,
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: process.env.NODE_ENV === "test" ? undefined : cookie,
  };

  app.use(session(sessionOptions));

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
