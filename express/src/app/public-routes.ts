import type { Request } from "express";
import type { OpenApiDocument } from "@saflib/openapi";

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

function templateToRegExp(template: string): RegExp {
  const source = template
    .split(/(\{[^}]+\})/)
    .map((part) =>
      part.startsWith("{")
        ? "[^/]+"
        : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("");
  return new RegExp(`^${source}/?$`);
}

/**
 * Matches requests for operations marked `x-public: true` in the given specs,
 * for {@link createProductHttpApp}'s `isPublicRoute`. `HEAD` follows `GET`,
 * and `OPTIONS` follows any public method on the path (CORS preflight).
 */
export function publicRouteMatcher(
  specs: OpenApiDocument[],
): (req: Request) => boolean {
  const routes: Array<{ method: string; path: RegExp }> = [];
  for (const spec of specs) {
    for (const [template, item] of Object.entries(spec.paths ?? {})) {
      for (const method of METHODS) {
        const op = (item as Record<string, unknown>)[method] as
          { "x-public"?: unknown } | undefined;
        if (op?.["x-public"] === true) {
          routes.push({
            method: method.toUpperCase(),
            path: templateToRegExp(template),
          });
        }
      }
    }
  }
  return (req) => {
    const method = req.method.toUpperCase();
    return routes.some(
      (r) =>
        r.path.test(req.path) &&
        (r.method === method ||
          (method === "HEAD" && r.method === "GET") ||
          method === "OPTIONS"),
    );
  };
}
