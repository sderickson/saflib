import crypto from "node:crypto";
import type { Handler } from "express";
import { typedEnv } from "@saflib/env";

const CSRF_COOKIE_NAME = "_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

declare global {
  namespace Express {
    interface Request {
      isValidCsrfToken: () => boolean;
    }
  }
}

const normalizeDomain = (domain: string | undefined): string | undefined => {
  if (!domain) {
    return undefined;
  }

  return `.${domain.replace(/^\.+/, "")}`;
};

const getCookieValue = (
  cookieHeader: string | string[] | undefined,
  name: string,
): string | undefined => {
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader;
  if (!raw) {
    return undefined;
  }

  const cookies = raw.split(";");
  for (const cookie of cookies) {
    const [cookieName, ...cookieValue] = cookie.trim().split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValue.join("="));
    }
  }
  return undefined;
};

const getHeaderValue = (
  headerValue: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }
  return headerValue;
};

const makeCsrfToken = (): string => crypto.randomBytes(24).toString("hex");

export const makeCsrfTokenMiddleware = (): Handler => {
  return (req, res, next): void => {
    req.isValidCsrfToken = () => {
      const cookieToken = getCookieValue(req.headers.cookie, CSRF_COOKIE_NAME);
      const headerToken = getHeaderValue(req.headers[CSRF_HEADER_NAME]);
      return (
        typeof cookieToken === "string" &&
        typeof headerToken === "string" &&
        cookieToken.length > 0 &&
        cookieToken === headerToken
      );
    };

    const existingToken = getCookieValue(req.headers.cookie, CSRF_COOKIE_NAME);
    if (!existingToken) {
      res.cookie(CSRF_COOKIE_NAME, makeCsrfToken(), {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: typedEnv.PROTOCOL === "https",
        domain: normalizeDomain(typedEnv.DOMAIN),
      });
    }

    return next();
  };
};
