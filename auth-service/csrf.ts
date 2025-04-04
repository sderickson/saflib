// simplified, typed version of https://www.npmjs.com/package/express-csrf-double-submit-cookie

import crypto from "crypto";
import type { CookieOptions, NextFunction, Request, Response } from "express";

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: false,
  path: "/",
};

type Options = {
  length?: number;
  cookie?: CookieOptions;
};

const DEFAULT_LENGTH = 24;
const NAME = "_csrf_token";

export const csrfDSC = (options: Options = {}) => {
  const cookieOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...options.cookie,
  };

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies[NAME]) {
      const csrfToken = crypto
        .randomBytes(options.length || DEFAULT_LENGTH)
        .toString("hex");
      req.cookies[NAME] = csrfToken;
      res.cookie(NAME, csrfToken, cookieOptions);
    }

    req.isValidCsrfToken = () => {
      const cookieToken = req.cookies[NAME];
      const requestToken = getCsrfToken(req);

      return Boolean(
        requestToken && cookieToken && cookieToken === requestToken,
      );
    };

    next();
  };

  return middleware;
};

/**
 * Returns token value from request.
 * @param {IncomingMessage} req
 * @return {string}
 */
function getCsrfToken(req: Request) {
  return req.headers["x-csrf-token"];
}
