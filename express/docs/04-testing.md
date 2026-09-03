# Testing

Handler tests should exercise the HTTP API per [best practices](../../best-practices.md#have-thorough-test-coverage). Prefer real database access with faked service boundaries.

## Handler tests (default)

Do **not** build the full monolith app for every handler test.

1. Mount the production **group router** from `handlers/<group>/index.ts` (e.g. `createTodosRouter`).
2. Use the slim harness from `@…-http/test/slim-route-test` (`acquireRouterSlimRouteTest`, `releaseSlimRouteTest`). See [base HTTP](https://github.com/sderickson/saflib/tree/main/base/service/http/test).
3. Use `beforeAll` / `afterAll` — not `beforeEach` — so OpenAPI middleware is not re-installed per test.
4. Set identity-shaped headers with `makeUserHeaders` or `makeAdminHeaders` from `@saflib/express`.
5. Call `releaseSlimRouteTest(ctx.lease)` in `afterAll` to disconnect the test database.

```ts
import request from "supertest";
import { makeUserHeaders } from "@saflib/express";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
  type SlimRouteTestContext,
} from "@saflib/base-http/test/slim-route-test";
import { createTodosRouter } from "./index.ts";

describe("createTodos", () => {
  let ctx: SlimRouteTestContext;

  beforeAll(() => {
    ctx = acquireRouterSlimRouteTest(createTodosRouter);
  });

  afterAll(() => {
    releaseSlimRouteTest(ctx.lease);
  });

  it("creates a todo", async () => {
    const response = await request(ctx.app)
      .post("/todos")
      .set(makeUserHeaders())
      .send({ title: "Buy milk" });
    expect(response.status).toBe(201);
  });
});
```

For a short chain of routers, prefer `acquireRouterSlimRouteTestMulti([createA, createB])` over the full app.

The slim harness still runs `buildBaseHttpApp` (global middleware, service context, auth gate, platform terminators). Your mounted router is the only **product** mount; jobs, cron, and audit still run after it.

## Coverage

- Include at least one test per response status the **handler** implements.
- Do **not** test invalid inputs that OpenAPI validation owns (malformed bodies, wrong types).
- Do **not** test **500** responses in handler tests — let unexpected errors propagate to error middleware.

## Integration tests (full app)

Use `create…HttpApp()` with default mounts only in `*.integration.test.ts` when you need the full monolith: multiple product routers, jobs/cron behavior, OAuth flows, or cross-router interactions.

### Gotchas

- **Mount order** — Platform routers (`createCronRouter`, etc.) end with a catch-all **404**. Product routers registered after them never run. Symptom: integration test returns **404** for a route that works in a slim handler test. Fix: ensure product mounts are listed before platform terminators in `http.ts` (see [base HTTP](https://github.com/sderickson/saflib/tree/main/base/service/http)).
- **Auth** — Most operations need `makeUserHeaders()` or `makeAdminHeaders()`. Admin-only operations also require the `site-admin-only` tag (and verified email / MFA) on the operation.
- **Public routes** — `no-auth` operations skip scoped auth when the path is also listed in `isPublicMonolithRoute` (keep in sync with Caddy `@public_monolith`).
- **CSRF** — Validation is skipped when `NODE_ENV=test`, so handler tests do not need CSRF tokens.
- **Dev-only routes** — Mock observability routes (logs, emails, error buffer listing, etc.) mount only when `DEPLOYMENT_NAME=development`.

## Shared model fixtures (`*-test` packages)

Prefer factories from product test packages over hand-building large API models in every file:

- Core models: `@scope/<product>-test/factories/*` (adjacent to `service/spec` as `service/test`)
- Offshoot models: `@scope/<product>-<offshoot>-test/factories/*`

Prod empties stay on `*-spec`. Package-local `testing/` is for DB/HTTP harnesses (slim route tests), not shared model shapes. Add a factory to the appropriate `*-test` package (`saf.kind: "test"`) when the same fixture is reused.

## Mocking

Handler tests should use the real database and mock other services. Mocks belong in client/SDK packages, not in `-http` packages — see [fakes and adapters](../../best-practices.md#build-and-maintain-fakes-and-adapters-for-service-boundaries).

To test error paths, import the client mock and `vi.spyOn` the method under test rather than adding mocks inside the HTTP package.
