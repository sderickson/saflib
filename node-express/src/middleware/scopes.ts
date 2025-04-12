import type { Handler } from "express";
import type { Request } from "express";

function getScopesFromReq(req: Request) {
  const security = req.openapi?.schema.security || [];
  const requiredScopes = new Set<string>();

  for (const strategy of security) {
    if (strategy.scopes) {
      for (const scope of strategy.scopes) {
        requiredScopes.add(scope);
      }
    }
  }

  return requiredScopes;
}

/**
 * Creates middleware that validates user scopes against OpenAPI security requirements.
 * Expects the auth middleware to have run first to populate req.auth.scopes.
 * Throws 403 if user doesn't have required scopes.
 */
export const createScopeValidator = (): Handler => {
  return (req, res, next): void => {
    const requiredScopes = getScopesFromReq(req);

    if (requiredScopes.size === 0) {
      return next();
    }

    const userScopes = new Set(req.auth.scopes);
    const missingScopes = requiredScopes.difference(userScopes);

    if (missingScopes.size > 0) {
      res.status(403).json({
        error: `Insufficient permissions. Missing scopes: ${Array.from(
          missingScopes,
        ).join(", ")}`,
      });
      return;
    }

    return next();
  };
};
