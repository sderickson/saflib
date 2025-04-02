# Test Routes

Tests for node/express routes should be focused unit tests that use the actual database but mock expensive or external operations. They should run the same middleware as the live application.

Example:

````ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";

// Mock expensive operations
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

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

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });
});

## What to Mock

1. **Do Mock**:
   - Expensive operations (e.g., password hashing with argon2)
   - Random operations (e.g., token generation with crypto)
   - 3rd party integrations (e.g., email sending)
   - External services (e.g., payment processors)

2. **Don't Mock**:
   - Database operations (use the actual database)
   - Application middleware
   - Request/response handling

Example of mocking a 3rd party service:

```ts
// Mock email service
vi.mock("@saflib/email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
````

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

## Testing Checklist

When adding tests for new API routes, ensure:

1. **Complete coverage**: Test all success and error paths
2. **Database state**: Set up required database state before each test
3. **Error handling**: Test that errors are properly caught and converted to appropriate HTTP responses
4. **Session state**: Use agents when testing flows that require session state
5. **Mocking**: Mock only expensive/external operations, not the database

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
