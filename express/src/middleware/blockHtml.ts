import type { Handler, Request, Response, NextFunction } from "express";
import { OPENAPI_TAG_BLOCK_HTML_EXEMPT } from "@saflib/openapi";

/** Line-break markup allowed in markdown program text (legacy editor shortcuts). */
const ALLOWED_BR_TAG = /^<\s*br\s*\/?\s*>$/i;

const HTML_TAG = /<[^>]+>/g;

/** Error `code` on the 400 when a request body has HTML. */
export const HTML_NOT_ALLOWED_CODE = "HTML_NOT_ALLOWED" as const;

function containsDisallowedHtml(value: string): boolean {
  for (const match of value.matchAll(HTML_TAG)) {
    const tag = match[0];
    if (!ALLOWED_BR_TAG.test(tag)) {
      return true;
    }
  }
  return false;
}

/**
 * True when `value` (a string, or any strings nested in arrays/objects) has
 * HTML tags other than `<br>`. The same check `blockHtml` applies to request
 * bodies; handlers on `block-html-exempt` operations can use it for the fields
 * they don't sanitize themselves.
 */
export function valueContainsDisallowedHtml(value: unknown): boolean {
  if (typeof value === "string") {
    return containsDisallowedHtml(value);
  }
  if (Array.isArray(value)) {
    return value.some(valueContainsDisallowedHtml);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(valueContainsDisallowedHtml);
  }
  return false;
}

export const blockHtml = (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  if (body !== undefined && valueContainsDisallowedHtml(body)) {
    res
      .status(400)
      .json({ error: "HTML is not allowed", code: HTML_NOT_ALLOWED_CODE });
    return;
  }
  next();
};

/**
 * Enforce JSON body HTML blocking unless the operation is tagged
 * `block-html-exempt`.
 *
 * Must run after OpenAPI validation (`req.openapi.schema`).
 */
export const makeBlockHtmlMiddleware = (): Handler => {
  return (req, res, next): void => {
    if (!req.openapi?.schema) {
      next(
        new Error(
          "blockHtml middleware requires a matched OpenAPI operation (mount after createOpenApiValidator)",
        ),
      );
      return;
    }

    const tags = req.openapi.schema.tags;
    if (tags?.includes(OPENAPI_TAG_BLOCK_HTML_EXEMPT)) {
      next();
      return;
    }

    blockHtml(req, res, next);
  };
};
