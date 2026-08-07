import type { IncomingMessage, RequestListener } from "node:http";

/**
 * Module-private Symbol used to tag requests that arrived on the internal
 * listener. Not exported — middleware must use {@link isInternalRequest}.
 */
const safInternalRequest = Symbol("safInternalRequest");

type PossiblyInternalRequest = IncomingMessage & {
  [safInternalRequest]?: true;
};

/**
 * Wraps an HTTP request listener (e.g. an Express app) so each request is
 * tagged as internal via a non-enumerable, process-local Symbol property
 * before the underlying app handles it.
 *
 * The tag can only be set in-process — it is not derived from headers.
 * Use with `http.createServer(markInternal(app))` or `supertest(markInternal(app))`.
 */
export function markInternal(app: RequestListener): RequestListener {
  return (req, res) => {
    Object.defineProperty(req, safInternalRequest, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    app(req, res);
  };
}

/**
 * Returns whether `req` was tagged by {@link markInternal}.
 * Safe to call on any IncomingMessage; returns false when the tag is absent.
 */
export function isInternalRequest(req: IncomingMessage): boolean {
  return (req as PossiblyInternalRequest)[safInternalRequest] === true;
}
