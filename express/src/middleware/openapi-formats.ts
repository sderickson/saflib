import type { Format } from "express-openapi-validator/dist/framework/types.ts";

/**
 * Permissive `format: email` for OpenAPI request/response validation.
 * AJV's built-in email format rejects some real addresses (e.g. `+` tags) and
 * is picky about IDNA; we only need a coarse guard before handlers run.
 */
export const lenientEmailOpenApiFormat: Format = {
  name: "email",
  type: "string",
  validate: (value: unknown): boolean => {
    if (typeof value !== "string") {
      return false;
    }
    const email = value.trim();
    if (email.length < 3 || email.length > 320) {
      return false;
    }
    if (/\s/.test(email)) {
      return false;
    }
    const at = email.indexOf("@");
    if (at <= 0 || at === email.length - 1) {
      return false;
    }
    const domain = email.slice(at + 1);
    return domain.includes(".") && domain.indexOf(".") < domain.length - 1;
  },
};
