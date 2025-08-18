# Testing

Things to keep in mind when writing tests for API routes served by Express.

## Application Interface

Tests should mainly test the API interface per [best practices](../../best-practices.md#have-thorough-test-coverage).

To do this:

- Create an Express app for each test, using the app exported by [http.ts](./01-overview.md#httpsts), using `beforeEach`.
- Use `@saflib/express`'s `makeUserHeaders` to create headers that would otherwise be provided by the identity service via Caddy.
- Use `supertest`'s `request` to make the request.

Tests should include at least one test for each response code. It does not need to test invalid inputs (one can assume [express-openapi-validator](https://www.npmjs.com/package/express-openapi-validator) will do its job).

## Mocking

Tests for Express routes should be integration tests that use the actual database but mock other services, both internal and external.

Mocks should not be owned by the `@saflib/express`-dependent package, however. Instead, the service client should mock behavior when in a test environment. Express packages should refrain from creating their own mocks and instead contribute to the client package's mocking system per [best practices](../../best-practices.md#mock-fake-and-shim-service-boundaries).

When tests want to change mock behaviors, for example to test error responses, they should import mocks provided by those client libraries and use `vi.spyOn` on the client to incorporate those mocks.
