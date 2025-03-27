# Testing Express Middleware

This guide explains how to write effective tests for Express middleware using Vitest. We'll cover common patterns, best practices, and examples from our codebase.

## Basic Structure

A middleware test suite typically follows this structure:

```typescript
import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { yourMiddleware } from "./yourMiddleware";

describe("Your Middleware", () => {
  it("should do something specific", () => {
    // Test implementation
  });
});
```

## Setting Up Test Fixtures

### Simple Approach

For simple middleware that doesn't need setup between tests:

```typescript
const req = {} as Request;
const res = {} as Response;
const next = vi.fn() as NextFunction;
```

### Using beforeEach

For more complex middleware where you need fresh mocks for each test:

```typescript
let mockReq: Partial<Request>;
let mockRes: Partial<Response>;
let nextFunction: NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
  mockReq = { headers: {} };
  mockRes = {};
  nextFunction = vi.fn();
});
```

## Common Testing Patterns

### 1. Testing Header Processing

Example from `requestId.test.ts`:

```typescript
it("should add a request ID to the request object from header", () => {
  const req = {} as Request;
  req.headers = {
    "x-request-id": "1234567890",
  };

  requestId(req, res, next);

  expect(req.id).toBe("1234567890");
  expect(next).toHaveBeenCalled();
});
```

### 2. Testing Authentication/Authorization

Example from `auth.test.ts`:

```typescript
it("should populate auth object with user info and scopes", () => {
  mockReq.headers = {
    "x-user-id": "123",
    "x-user-email": "test@example.com",
    "x-user-scopes": "admin,write",
  };

  auth(mockReq as Request, mockRes as Response, nextFunction);

  expect(mockReq.auth).toEqual({
    userId: 123,
    userEmail: "test@example.com",
    scopes: ["admin", "write"],
  });
  expect(nextFunction).toHaveBeenCalledWith();
});
```

### 3. Testing Error Handling

Example from `auth.test.ts`:

```typescript
it("should return 401 when required headers are missing", () => {
  mockReq.headers = {
    "x-user-scopes": "admin",
  };

  auth(mockReq as Request, mockRes as Response, nextFunction);

  expect(nextFunction).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 401,
      message: "Unauthorized",
    })
  );
});
```

## Best Practices

1. **Mock Dependencies**: Use `vi.fn()` for the `next` function to track calls and arguments.

2. **Type Safety**: Use proper TypeScript types:

   ```typescript
   let mockReq: Partial<Request>;
   let mockRes: Partial<Response>;
   let nextFunction: NextFunction;
   ```

3. **Clean Setup**: Use `beforeEach` to reset state between tests:

   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
     // Reset other mocks/state
   });
   ```

4. **Comprehensive Testing**: Test both success and error cases:

   - Happy path (expected input)
   - Edge cases (empty values, missing fields)
   - Error conditions (invalid input, missing required data)

5. **Assertions**:

   - Verify middleware modifies request/response as expected
   - Check `next()` is called appropriately
   - Validate error handling
   - Use `expect.objectContaining()` for partial object matches

6. **Descriptive Test Names**: Use clear, action-oriented test names that describe the expected behavior:
   ```typescript
   it(
     "should populate auth object with user info and empty scopes when no scope header"
   );
   it("should return 401 when user ID is missing");
   ```

## Common Gotchas

1. **Type Casting**: When creating mock objects, you might need to cast them to the correct type:

   ```typescript
   auth(mockReq as Request, mockRes as Response, nextFunction);
   ```

2. **Headers Object**: Always initialize the headers object when mocking requests:

   ```typescript
   mockReq = {
     headers: {}, // Don't forget this!
   };
   ```

3. **Next Function**: Always verify the `next` function is called appropriately:
   ```typescript
   expect(nextFunction).toHaveBeenCalled(); // For success cases
   expect(nextFunction).toHaveBeenCalledWith(
     expect.objectContaining({
       status: 401,
     })
   ); // For error cases
   ```

## Example Test Suite

Here's a complete example combining these practices:

```typescript
describe("Auth Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = {};
    nextFunction = vi.fn();
  });

  it("should handle successful case", () => {
    mockReq.headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
    };

    auth(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockReq.auth).toBeDefined();
    expect(nextFunction).toHaveBeenCalledWith();
  });

  it("should handle error case", () => {
    auth(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
      })
    );
  });
});
```

This pattern ensures your middleware is thoroughly tested and behaves correctly in all scenarios.
