/**
 * Kratos webhook context as templated by `function(ctx) ctx`. Fields are
 * documented in https://www.ory.sh/docs/kratos/hooks/configure-hooks under
 * "Available web hook context". All fields are optional from saflib's
 * perspective: presence depends on which flow stage fired the hook (e.g.
 * `identity` is present on `after.<method>` hooks, absent on `before`).
 *
 * `[key: string]: unknown` allows forward-compatible additions without
 * forcing saflib version bumps. Consumers narrow as they need.
 */
export interface KratosActionContext {
  flow?: {
    id?: string;
    type?: "browser" | "api";
    request_url?: string;
    issued_at?: string;
    expires_at?: string;
    active?: string;
    state?: string;
    [key: string]: unknown;
  };
  request_method?: string;
  request_url?: string;
  request_headers?: Record<string, string[]>;
  request_cookies?: Record<string, string>;
  identity?: {
    id?: string;
    schema_id?: string;
    traits?: Record<string, unknown>;
    [key: string]: unknown;
  };
  session?: {
    id?: string;
    identity_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** A single Kratos webhook delivery, packaged for the application. */
export interface KratosAction {
  body: KratosActionContext;
  request: {
    userAgent?: string;
    acceptLanguage?: string;
    forwardedFor?: string;
  };
}

/** Application-level handler. Called once per accepted webhook delivery. */
export interface KratosActionHandler {
  onAction: (action: KratosAction) => Promise<void>;
}
