import type { Handler } from "express";

// Extend Express Request type to include id property
declare global {
  namespace Express {
    interface Request {
      id: string;
      shortId: string;
    }
  }
}

/**
 * Middleware that adds a unique request ID to each incoming request.
 * The ID is generated using UUID v4 and truncated to 8 characters.
 * This ID can be used for request tracing and logging correlation.
 */
export const requestId: Handler = (req, _, next): void => {
  if (!req.headers || !req.headers["x-request-id"]) {
    req.id = "no-request-id";
  } else {
    req.id = req.headers["x-request-id"] as string;
    req.shortId = req.id.slice(0, 8);
  }
  next();
};
