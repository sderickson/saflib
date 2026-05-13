import type { NextFunction, Request, Response } from "express";

/**
 * Disallow storing responses in shared or private caches. Use for APIs that
 * return session-, tenant-, or user-specific data (RFC 7234).
 */
export const noStoreCacheControl = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.setHeader(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  next();
};
