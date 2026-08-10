import type { Format } from "express-openapi-validator/dist/framework/types.ts";
import { lenientEmailValidate } from "@saflib/openapi/ajv-formats";

/**
 * Permissive `format: email` for OpenAPI request/response validation.
 * AJV's built-in email format rejects some real addresses (e.g. `+` tags) and
 * is picky about IDNA; we only need a coarse guard before handlers run.
 */
export const lenientEmailOpenApiFormat: Format = {
  name: "email",
  type: "string",
  validate: lenientEmailValidate,
};
