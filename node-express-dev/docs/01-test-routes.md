# Test Routes

Tests for node/express routes should be fairly focused unit tests. They mock out all external dependencies, including databases and 3rd party integrations, but they should run the same middleware as the live application.

Example:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import yourRouter from "./users.js";
import { preMiddleware, errorHandlers } from "../middleware.ts"; // same as what's used in app.ts

// Create Express app for testing
const app = express();
app.use(preMiddleware);
app.use("/examples", exampleRouter);
app.use(errorHandlers);

// Mock user headers for all requests
const mockHeaders = {
  "x-user-id": "123",
  "x-user-email": "test@example.com",
};

describe("Example Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /examples/route", () => {
    it("should ...", async () => {
      const response = await request(app)
        .get("/examples/route")
        .set(mockHeaders);

      expect(response.status).toBe(200);
      /* Test response.body */
    });
  });
});
```

## Mocking Dependencies

When your route depends on external modules like the filesystem or a database, you need to mock them properly:

```ts
// Import the module you want to mock BEFORE mocking it
import * as fs from "fs";

// Mock the module
vi.mock("fs", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("fs")>();
  return {
    ...originalModule,
    readFileSync: vi.fn(),
  };
});

// In your test
it("should return data from file", async () => {
  // Set up the mock implementation
  (fs.readFileSync as any).mockReturnValue(JSON.stringify({ data: "test" }));

  // Make the request
  const response = await request(app).get("/route").set(mockHeaders);

  // Verify the response
  expect(response.status).toBe(200);
  expect(fs.readFileSync).toHaveBeenCalled();
});
```

See [mocking.md](./02-mock-dependencies.md) for more details, especially if your mocking isn't working!

## Common Issues

### OpenAPI Specification Validation

Our API middleware validates responses against the OpenAPI specification. If a route returns a status code that is not defined in the spec, the middleware will convert it to a 500 error.

**Common symptoms:**

- Tests expecting specific error codes (like 403, 404) receive 500 errors instead
- Console output shows warnings like: `====== no schema defined for status code '403' in the openapi spec ======`

**How to fix:**

1. Check the OpenAPI specification in `specs/apis/routes/*.yaml` for the route you're testing
2. Ensure all status codes your route can return are properly defined in the spec
3. Run `npm run generate` from the `specs/apis` folder to generate the generated specs

## Testing Checklist

When adding tests for new API routes, ensure:

1. **Complete coverage**: Test all success and error paths
2. **Status code alignment**: Verify that all status codes returned by your implementation are defined in the OpenAPI spec
3. **Error handling**: Test that errors are properly caught and converted to appropriate HTTP responses
4. **Authorization**: Test both authorized and unauthorized access scenarios
5. **Simplify assertions**: Focus on testing the essential behavior (status codes, response structure) rather than exact response content

## Running Tests

To run API tests:

```bash
cd services/api
npm run test
```

To run specific test files:

```bash
npm run test -- routes/your-route.test.ts
```

## Debugging Failed Tests

When tests fail with unexpected status codes:

1. Check the console output for OpenAPI validation warnings
2. Compare the route implementation with the OpenAPI specification
3. Update either the implementation or the specification to align them
