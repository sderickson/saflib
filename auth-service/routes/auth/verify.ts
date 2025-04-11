import type { Request, Response } from "express";
import { createHandler } from "@saflib/node-express";
import { getUserScopes } from "./_helpers.ts";
import { type AuthResponse } from "@saflib/auth-spec";

export const verifyHandler = createHandler(
  async (req: Request, res: Response) => {
    // TODO: Figure out how to handle OPTIONS in caddy, or at the very least,
    // don't forward_auth OPTIONS requests.

    if (req.headers["x-forwarded-uri"] === "/health") {
      res.status(200).end();
      return;
    }

    if (req.headers["x-forwarded-method"] === "OPTIONS") {
      res.status(200).end();
      return;
    }

    if (!req.isAuthenticated()) {
      const errorResponse: AuthResponse["verifyAuth"][401] = {
        error: "Unauthorized!",
      };
      res.status(401).json(errorResponse);
      return;
    }

    if (!req.isValidCsrfToken()) {
      const errorResponse: AuthResponse["verifyAuth"][403] = {
        error: "CSRF token mismatch!",
      };
      res.status(403).json(errorResponse);
      return;
    }

    // Add headers for downstream services
    const user = req.user as Express.User;
    const scopes: string[] = [];
    res.setHeader("X-User-ID", user.id.toString());
    res.setHeader("X-User-Email", user.email);
    if (req.app.get("saf:admin emails").has(user.email)) {
      const emailAuth = await req.db.emailAuth.getByEmail(user.email);
      if (emailAuth.verifiedAt) {
        // TODO: properly give scopes based on admin role.
        // and what scopes exist.
        scopes.push("users:read");
        scopes.push("todos:nuke");
      }
    }

    if (scopes.length === 0) {
      scopes.push("none");
    }
    res.setHeader("X-User-Scopes", scopes.join(","));

    const successResponse: AuthResponse["verifyAuth"][200] = {
      id: user.id,
      email: user.email,
      scopes,
    };
    res.status(200).json(successResponse);
  },
);
