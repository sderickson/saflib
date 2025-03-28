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
import { authRouter } from "./routes/auth.ts";
import { sessionStore } from "./session-store.ts";
// Define properties added to Express Request objects by middleware
declare global {
  namespace Express {
    interface Request {
      db: AuthDB;
    }
  }
}

const app = express();
app.set("trust proxy", true);

// Initialize database
const db = new AuthDB();

// Apply recommended middleware
app.use(createPreMiddleware());

// Session configuration
const cookie = {
  secure: process.env.PROTOCOL === "https",
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: "strict" as const,
  domain: `.${process.env.DOMAIN}`, // Allow cookies to be shared across subdomains
};

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie,
  }),
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

export default app;
