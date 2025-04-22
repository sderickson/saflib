# Test Routes

Tests for node/express routes should be integration tests that use the actual database but mock expensive or external operations. They should run the same middleware as the live application.

Example:

````ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";

// Mock random operations
vi.mock("crypto", async (importOriginal) => {
  const crypto = await importOriginal<typeof import("crypto")>();
  return {
    ...crypto,
    randomBytes: vi.fn().mockReturnValue("test-token"),
  };
});

describe("Login Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  it("should login a user successfully", async () => {
    // First create a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    await request(app).post("/auth/register").send(userData);

    // Then try to login
    const response = await request(app).post("/auth/login").send(userData);

    // Assert on status directly for better error reporting
    expect(response.status).toBe(200);
    // Assert on the structure and key fields of the success response body
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });

  it("should return 401 for invalid credentials", async () => {
     const invalidData = {
       email: "test@example.com", // Assume user exists
       password: "wrongpassword",
     };
     const response = await request(app).post("/auth/login").send(invalidData);

     // Assert ONLY on the status code for error responses
     expect(response.status).toBe(401);
     // Avoid asserting on response.body.message, as these are often for debugging
     // and make tests brittle. The status code sufficiently indicates the error type.
  });
});

## What to Mock

1. **Do Mock**:
   - Random operations (e.g., token generation with crypto)
   - 3rd party integrations and services (e.g., email sending)

2. **Don't Mock**:
   - Database operations (use the actual database)
   - Application middleware
   - Request/response handling

Ideally, SAF libraries should provide their own `__mocks__` with a reasonable default so dependent services can easily mock them in tests:

```ts
// Mock email service - internally mocks nodemailer so you don't have to.
vi.mock("@saflib/email");
```

## Mocking Best Practices

1. **Mock Hoisting**:
   - Vitest automatically hoists `vi.mock()` calls to the top of the file
   - You can place mocks anywhere in the file, but they will be executed first
   - Important: Don't use variables from the global scope inside mock functions, as they won't exist yet due to hoisting
   - Example:
     ```ts
     // This will work fine, even though it's not at the top
     vi.mock("crypto", async (importOriginal) => {
       const crypto = await importOriginal<typeof import("crypto")>();
       return {
         ...crypto,
         randomBytes: vi.fn().mockReturnValue("test-token"),
       };
     });

     // This would cause an error because `someGlobal` isn't available during hoisting
     // vi.mock("crypto", () => ({ randomBytes: () => someGlobal })); // Don't do this!
     ```

2. **Mocking Node Built-ins**:
   - When mocking Node.js built-in modules (like `crypto`), use `importOriginal` to preserve other functionality
   - Example:
     ```ts
     vi.mock("crypto", async (importOriginal) => {
       const crypto = await importOriginal<typeof import("crypto")>();
       return {
         ...crypto,
         randomBytes: vi.fn().mockReturnValue("test-token"),
       };
     });
     ```

3. **Mocking External Dependencies**:
   - Mock the entire module, not just specific functions
   - Provide mock implementations for all used functions
   - Example:
     ```ts
     vi.mock("@saflib/email-service", () => ({
       sendEmail: vi.fn().mockResolvedValue({ success: true }),
       // Mock other functions used by the module
       validateEmail: vi.fn().mockReturnValue(true),
     }));
     ```

4. **Mocking Database Operations**:
   - Don't mock the database itself
   - Instead, use the actual database with test data
   - Clear and set up test data in `beforeEach` or `beforeAll` hooks
   - The database library should itself run an in-memory version when `NODE_ENV` is `"test"`.

## Test Setup

1. Create the app in `beforeEach`:

   ```ts
   beforeEach(() => {
     app = createApp();
     vi.clearAllMocks();
   });
   ```

2. Use `supertest` for making requests:

   ```ts
   const response = await request(app)
     .post("/auth/login")
     .send({ email: "test@example.com", password: "password123" });
   ```

3. For tests requiring session state (cookies), use a `supertest` agent:
   ```ts
   const agent = request.agent(app);
   await agent.post("/auth/login").send(credentials);
   await agent.get("/protected-route");
   ```

## Assertion Strategy

1.  **Success Cases (2xx):**
    *   Assert the correct status code using `expect(response.status).toBe(200)` (or 201, etc.).
    *   Assert the structure and key fields of the response body using `expect(response.body).toEqual(...)` or `expect(response.body).toMatchObject(...)`. Focus on identifiers, important data fields, and presence/absence of expected properties. Avoid asserting on fields that might change frequently or are not critical to the API contract (e.g., `updatedAt` timestamps unless essential).

2.  **Error Cases (4xx, 5xx):**
    *   Assert **only** the expected status code using `expect(response.status).toBe(400)` (or 401, 403, 404, 409, etc.).
    *   Do **not** assert on 5xx. If those happen, those should be fixed, not tested for.
    *   **Do not** assert on the content of the error response body (e.g., `response.body.message`). These messages are primarily for debugging and can change, making tests unnecessarily brittle. The HTTP status code is the contractual way to signal the type of error in an API.
    *   Avoid helper functions like `expectStatus` that wrap the status check, as they can obscure the exact line where a test failure occurs in test runner output. Direct status checks provide clearer stack traces.

## Testing Checklist

When adding tests for new API routes, ensure:

1.  **High coverage**: Test success and **relevant** error paths (focus on distinct error conditions signaled by status codes).
2.  **Database state**: Set up required database state before each test.
3.  **Error handling**: Test that errors result in the appropriate HTTP status codes.
4.  **Assertions**: Follow the [Assertion Strategy](#assertion-strategy) - check body structure for success, only status code for errors.
5.  **Mocking**: Mock only expensive/external operations, not the database.

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

When tests fail:

1. Check the database state before and after the test
2. Verify that all required mocks are in place
3. Check that session state is properly maintained when using agents
4. Look for unhandled promise rejections or middleware errors
````
