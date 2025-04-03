import type { Request, Response } from "express";
import { createHandler } from "@saflib/node-express";
import { getUserScopes } from "./helpers.ts";
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

    const user = req.user as Express.User;
    // Add user info to response headers for potential use by downstream services
    res.setHeader("X-User-ID", user.id.toString());
    res.setHeader("X-User-Email", user.email);

    // Get user scopes and add to headers
    const scopes = await getUserScopes(req.db, user.id);

    if (req.app.get("adminEmails").has(user.email)) {
      scopes.push("admin");
    }

    if (scopes.length === 0) {
      scopes.push("none");
    }
    res.setHeader("X-User-Scopes", scopes.join(","));

    // Return user info including scopes in response body
    const successResponse: AuthResponse["verifyAuth"][200] = {
      id: user.id,
      email: user.email,
      scopes,
    };
    res.status(200).json(successResponse);
  },
);
