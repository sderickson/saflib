# Testing

Things to keep in mind when writing tests for API routes served by Express.

## Application interface

Tests should mainly test the API interface per [best practices](../../best-practices.md#have-thorough-test-coverage).

### Default: slim router mount

Route handler tests should **not** build the full HTTP app from `http.ts` on every test.

1. Mount the **production group router** from `routes/<group>/index.ts` (e.g. `createTodosRouter`).
2. Use the slim harness from `testing/slim-route-test.ts` (`acquireRouterSlimRouteTest`, `releaseSlimRouteTest`).
3. Use `beforeAll` / `afterAll` — not `beforeEach` — so OpenAPI middleware is not re-installed per test.
4. Use `@saflib/express`'s `makeUserHeaders` (or product fixtures) for identity-shaped headers.
5. Use `supertest`'s `request` against `ctx.app`.

```ts
import { createTodosRouter } from "./index.ts";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
} from "../../testing/slim-route-test.ts";

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

### When to use the full app

Use `create…HttpApp()` from `http.ts` (default mount list) only for:

- Monolith smoke tests (`index.test.ts` at package root).
- Explicit `*.integration.test.ts` files that need multiple routers or monolith chrome (cron, jobs, OAuth, etc.).

For a small multi-router chain, prefer `acquireRouterSlimRouteTestMulti([createA, createB])` over the full app when possible.

## Coverage expectations

Tests should include at least one test for each response code the **handler** implements. Do not test invalid inputs that OpenAPI validation owns (malformed bodies, wrong types) — assume [express-openapi-validator](https://www.npmjs.com/package/express-openapi-validator) does its job for those.

Do not test 500 responses in handler tests.

## Shared model fixtures (`*-test` packages)

Hand-building large OpenAPI model objects in every test file does not scale. Prefer factories from product test packages:

- Core service models: `@scope/<product>-test/factories/*` (lives next to `service/spec` as `service/test`)
- Offshoot models / provenance: `@scope/<product>-<offshoot>-test/factories/*` and `provenance/*` (e.g. `dossier/test`)

Prod empties stay on `*-spec` (`empties`). Package-local `testing/` stays for DB/HTTP mount harnesses (e.g. slim route tests), not for shared model shapes. When the same fixture is needed in more than one test, add a factory to the appropriate `*-test` package (`saf.kind: "test"`).

## Mocking

Tests for Express routes should be integration tests that use the actual database but mock other services, both internal and external.

Mocks should not be owned by the `@saflib/express`-dependent package, however. Instead, the service client should mock behavior when in a test environment. Express packages should refrain from creating their own mocks and instead contribute to the client package's mocking system per [best practices](../../best-practices.md#mock-fake-and-shim-service-boundaries).

When tests want to change mock behaviors, for example to test error responses, they should import mocks provided by those client libraries and use `vi.spyOn` on the client to incorporate those mocks.
