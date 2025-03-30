# Mock Dependencies

Tests written for node-express services should be unit tests, so they should mock databases and 3rd party services they depend on.
When writing tests for services or APIs that use external dependencies, you'll need to mock them properly. Here's the recommended approach using Vitest:

## Mocking Database Modules

```typescript
import * as yourModule from "@your-project/dbs-your-db-name";

// Mock the database module
vi.mock("@your-project/dbs-your-db-name", async (importOriginal) => {
  // Import the original module to get the real error classes
  const originalModule =
    await importOriginal<typeof import("@your-project/dbs-your-db-name")>();

  // Create mock data
  const mockData = {
    id: 1,
    name: "Test Item",
    createdAt: new Date(),
    // ... other fields
  };

  // Create mock implementations
  const mockMethods = {
    getById: vi.fn().mockImplementation((id) => {
      if (id === 999) {
        throw new originalModule.ItemNotFoundError(id);
      }
      return Promise.resolve(mockData);
    }),
    // ... other methods
  };

  return {
    // Keep the original error classes and other exports
    ...originalModule,

    // Override only the specific module you need to mock
    yourModule: mockMethods,
  };
});

// Rest of your test file
```

## Mocking Node.js Built-in Modules

When mocking built-in Node.js modules like `fs`, follow this pattern:

```typescript
// Import the module BEFORE mocking it
import * as fs from "fs";

// Mock the fs module
vi.mock("fs", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("fs")>();

  return {
    ...originalModule,
    readFileSync: vi.fn(),
  };
});

// In your test
it("should read a file", async () => {
  // Set up the mock implementation
  (fs.readFileSync as any).mockReturnValue(JSON.stringify({ data: "test" }));

  // Call your function that uses fs.readFileSync
  const result = await yourFunction();

  // Verify the result
  expect(fs.readFileSync).toHaveBeenCalled();
  expect(result).toEqual({ data: "test" });
});
```

## Common Pitfalls

1. **Import Order**: You don't need to worry about this, actually. Vitest hoists the mock above the import so in the test, the imported library will be mocked.

2. **Import Style**: Use `import * as moduleName` instead of default imports to capture all exports from the module. Or import the specific things you need such as import { ... } from "module";

3. **Using importOriginal**: Always use `importOriginal` to get the original module's functionality, especially for error classes and other exports you don't want to mock.

4. **Type Safety**: Use TypeScript generics with `importOriginal<typeof import("...")>()` to maintain type safety in your mocks.

5. **Reset Mocks**: Use `vi.clearAllMocks()` in `beforeEach()` to reset mock state between tests.

6. **Partial Mocking**: Only mock the specific methods you need to test. Keep the rest of the module intact to avoid unexpected behavior.

7. **Mock Implementation**: Be careful with complex mock implementations. Keep them simple and focused on the test case.

## Example: Testing a Route that Uses the Filesystem

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import * as fs from "fs";
import yourRouter from "./your-router";
import { preMiddleware, errorHandlers } from "../middleware";

// Mock fs module
vi.mock("fs", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("fs")>();
  return {
    ...originalModule,
    readFileSync: vi.fn(),
  };
});

// Create Express app for testing
const app = express();
app.use(preMiddleware);
app.use("/your-route", yourRouter);
app.use(errorHandlers);

describe("Your Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return file contents", async () => {
    // Mock the fs.readFileSync to return test data
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({ data: "test" }));

    const response = await request(app).get("/your-route");

    expect(response.status).toBe(200);
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(response.body).toHaveProperty("data");
  });
});
```
