# Middleware

`@saflib/express` ships standard middleware used by SAF HTTP services. Bundles are composed via [`createGlobalMiddleware`](./ref/@saflib/express/functions/createGlobalMiddleware.md), [`createOperationScopedMiddleware`](./ref/@saflib/express/functions/createScopedMiddleware.md) / [`createScopedMiddleware`](./ref/@saflib/express/functions/createScopedMiddleware.md), and [`createErrorMiddleware`](./ref/@saflib/express/functions/createErrorMiddleware.md). [`createInternalMiddleware`](./ref/@saflib/express/functions/createInternalMiddleware.md) is a slimmer stack for internal-only listeners.

Middleware falls into three layers:

- **Global** — top of the app, every request
- **Scoped** — per route or OpenAPI operation
- **Error** — after all routes (404 + error handler)

Auth assumes a reverse proxy (typically Caddy `forward_auth`) has already verified the session and forwarded trusted identity headers.

## Global

- **Metrics** — Prometheus RED metrics; `/metrics` scrape endpoint (internal-only in non-dev deployments)
- **Cache control** — `Cache-Control: no-store` on API responses
- **Helmet** — standard security headers
- **CSRF token** — sets the `_csrf_token` cookie used by scoped CSRF validation
- **Health** — `GET /health` for readiness/liveness probes
- **Request logging** — lightweight Morgan logging for every request
- **Body parsing** — `json` and `urlencoded` parsers
- **HTML blocking** — rejects JSON bodies that contain HTML tags
- **CORS** — allows configured product subdomains (`DOMAIN`, `PROTOCOL`, `CLIENT_SUBDOMAINS`)

## Scoped

- **Upload ordering** — with `fileUploader`, CSRF, context, and auth run after route matching but before multer parses the body, so rejected requests never write their upload to disk. Temp files from uploads rejected later (validation, handler errors) are deleted once the response finishes.
- **OpenAPI validation** — request/response validation via `express-openapi-validator`; attaches `req.openapi`
- **CSRF** — double-submit token check on unsafe methods (skips `x-public` operations and the `csrf-exempt` tag)
- **Context** — populates `@saflib/node` AsyncLocalStorage for handlers and loggers
- **Unsafe request logging** — structured logging for mutating requests (Winston → Loki in production)
- **Auth** — enforces each operation's OpenAPI `security` (built-in `session` scheme with `email-verified`, `mfa`, `site-admin` scopes, plus product schemes passed as `securityResolvers`); `x-public: true` operations skip it. An operation that declares neither fails at mount time.

## Error

- **Not found** — 404 for unmatched routes
- **Error handler** — logs 5xx errors and returns the [standard error format](../../openapi/schemas/error.yaml)

## Optional

- **Change events** — `createChangeEventMiddleware` publishes `@saflib/notify` change hints after successful writes (for SSE subscribers)
