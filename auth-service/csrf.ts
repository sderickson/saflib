"use strict";

import crypto from "crypto";
import type { CookieOptions, NextFunction, Request, Response } from "express";
const DEFAULT_OPTIONS = {
  length: 24,
  value: defaultValue,
};

const DEFAULT_COOKIE_OPTIONS = {
  httpOnly: false,
  name: "_csrf_token",
  path: "/",
};

/**
 * Simple middleware for "double submit cookie" CSRF protection method.
 * @see https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)_Prevention_Cheat_Sheet#Double_Submit_Cookie
 *
 * @param {object} options
 * @param {number} [options.length=24] Token length in bytes.
 * @param {function} [options.value=24] Function to get token from request (defaults: body._csrf_token || query._csrf_token || headers['x-csrf-token'])
 * @param {cookie} [options.cookie] Cookie options, see express res.cookie() documentation. Default: { name: '_csrf_token', path: '/' }
 */
type Options = {
  length?: number;
  value?: (req: Request) => string;
  cookie?: CookieOptions;
};

export const csrfDSC = (options: Options = {}) => {
  const optionsWithDefaults = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const cookieOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...optionsWithDefaults.cookie,
  };

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies[cookieOptions.name]) {
      const csrfToken = crypto
        .randomBytes(optionsWithDefaults.length)
        .toString("hex");
      req.cookies[cookieOptions.name] = csrfToken;
      res.cookie(cookieOptions.name, csrfToken, cookieOptions);
    }

    req.isValidCsrfToken = () => {
      // console.log("validating csrf token", req.cookies[cookieOptions.name]);
      // console.log("options.value", options.value(req));
      const cookieToken = req.cookies[cookieOptions.name];
      const requestToken = optionsWithDefaults.value(req);

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
function defaultValue(req: Request) {
  return (
    req.headers["x-csrf-token"] ||
    (req.body && req.body._csrf_token) ||
    (req.query && req.query._csrf_token)
  );
}
