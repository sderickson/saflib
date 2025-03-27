import { AuthDB } from "@saflib/auth-db";
import {
  createPreMiddleware,
  recommendedErrorHandlers,
} from "@saflib/node-express";
import express from "express";
import session from "express-session";
import passport from "passport";
import type { AuthApp, AuthConfig } from "../types.ts";
import { setupPassport } from "./passport.ts";
import { authRouter } from "./routes/auth.ts";
import { createSessionStore } from "./session-store.ts";

// Define properties added to Express Request objects by middleware
declare global {
  namespace Express {
    interface Request {
      db: AuthDB;
    }
  }
}

export function createApp(config: AuthConfig): AuthApp {
  const app = express() as AuthApp;
  app.set("trust proxy", true);

  // Initialize database
  const db = new AuthDB();

  // Apply recommended middleware
  app.use(createPreMiddleware());

  // Session configuration
  const cookie = {
    secure: config.protocol === "https",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "strict" as const,
    domain: `.${config.domain}`, // Allow cookies to be shared across subdomains
  };

  app.use(
    session({
      store: createSessionStore(config.nodeEnv),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie,
    })
  );

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
  app.use("/auth", authRouter);

  // Apply recommended error handlers
  app.use(recommendedErrorHandlers);

  return app;
}
