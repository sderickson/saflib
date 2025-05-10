# Routes

## Implementation Basics

- Use `createHandler` for each route handler. It ensures asynchronous errors are caught and passed to the central error handling middleware.
- Each route handler should be in its own file within a feature-specific directory (e.g., `/routes/feature-name/`). See [Setup](./01-setup.md) for the recommended structure.
- Handlers within a feature directory should be combined using an Express `Router` in the feature's `index.ts`.
- Use types generated from your OpenAPI specification (e.g., `@your-org/your-spec`) for request bodies, path parameters, query parameters, and response bodies to ensure conformance.
- **Error Handling Philosophy:**
  - Route handlers should **handle expected errors** returned by service/database layers (e.g., "Not Found", "Validation Failed"). This typically involves checking the `error` property of the returned object (see `ReturnsError` pattern).
  - Handlers translate these expected errors into appropriate HTTP status codes and response bodies (conforming to the OpenAPI spec).
  - **Unexpected errors** (database connection issues, bugs, errors _thrown_ by services) should _not_ be caught by `try/catch` in the handler. Let them propagate; `createHandler` will catch them and pass them to the central error middleware, typically resulting in a 500 response.
- Routes are primarily responsible for HTTP concerns: request validation (basic format), authorization checks, context extraction, calling service/DB layer, response formatting (mapping results/errors to HTTP status/body), and adhering to the API contract (OpenAPI spec).
- Note that openapi validation and auth middleware checks happen before, so routes should assume params, body, and auth are valid. A handler need never throw a 401, but they should throw 403s.
- Keep business logic out of route handlers; place it in separate service or database layer functions.

## Route Handler Structure

Each route handler should be in its own file (e.g., `routes/auth/login.ts`) and follow this pattern:

```typescript
import { createHandler } from "@saflib/node-express";
import { asyncLocalStorage } from "../../context.ts";
import type { ApiRequest, ApiResponse } from "@your-org/your-spec"; // Adjust spec import
import {
  UserNotFoundError,
  InvalidCredentialsError,
} from "@your-org/your-db-package"; // Adjust error imports
import createError from "http-errors"; // For creating standard HTTP errors

export const loginHandler = createHandler(async (req, res) => {
  // Get context
  const ctx = asyncLocalStorage.getStore()!;

  // Validate and type the request body according to the spec
  // Basic validation might happen here or in middleware
  const loginRequest: ApiRequest["loginUser"] = req.body;

  // Call the appropriate service/DB function
  const { result: user, error } = await ctx.db.user.authenticate(loginRequest);

  // Handle expected errors returned by the service/DB layer
  if (error) {
    switch (true) {
      case error instanceof UserNotFoundError:
      case error instanceof InvalidCredentialsError:
        // Send a typed 401 response conforming to the spec
        const errRes: ApiResponse["loginUser"][401] = {
          message: "Invalid email or password.",
        };
        return res.status(401).json(errRes);
      default:
        // If an unexpected error type was *returned* (should be rare),
        // throw it so the central error handler catches it.
        // This ensures all error types from the DB layer are handled.
        throw error satisfies never;
    }
  }

  // If successful, send a typed 200 response conforming to the spec
  const response: ApiResponse["loginUser"][200] = {
    user: { id: user.id, email: user.email /* ... other fields */ },
    token: "jwt.token.here", // Assuming token generation happens here or is returned by authenticate
  };
  res.status(200).json(response);
});
```

## Route Organization

Create a router file within each feature directory (e.g., `routes/auth/index.ts`) to combine handlers for that feature:

```typescript
// routes/auth/index.ts
import express from "express";
import { loginHandler } from "./login.ts";
import { registerHandler } from "./register.ts";
// Import other auth handlers...

const router = express.Router();

// Define routes for the auth feature
router.post("/login", loginHandler);
router.post("/register", registerHandler);
// Add other auth routes...

export { router as authRouter };
```

Mount these feature routers in the main router file (`routes/index.ts`), as shown in [Setup](./01-setup.md).

## Error Handling Examples

The `createHandler` wrapper simplifies error handling by catching unhandled promise rejections and thrown errors.

**Handling Expected Errors (Returned by Service/DB):**

```typescript
import { createHandler } from "@saflib/node-express";
import { asyncLocalStorage } from "../../context.ts";
import type { ApiRequest, ApiResponse } from "@your-org/your-spec";
import { CallSeriesNotFoundError } from "@your-org/your-db-package";
import createError from "http-errors";

export const getCallSeriesHandler = createHandler(async (req, res) => {
  const ctx = asyncLocalStorage.getStore()!;
  const { auth } = getSafContextWithAuth();
  const callSeriesId = parseInt(req.params.id);

  const { result: callSeries, error } =
    await ctx.db.callSeries.get(callSeriesId);

  if (error) {
    switch (true) {
      case error instanceof CallSeriesNotFoundError:
        // Return a 404 conforming to the spec
        // Note: createError(404) could also be thrown here, letting
        // the central handler format the response, if preferred.
        return res.status(404);
      default:
        // Unexpected *returned* error, escalate to central handler
        throw error satisfies never;
    }
  }

  // Check Authorization (Example)
  if (callSeries.ownerId !== auth.userId) {
    throw createError(403);
  }

  const response: ApiResponse["getCallSeries"][200] = {
    call_series: {
      /* map db result to api spec */
    },
  };
  res.status(200).json(response);
});
```

## Best Practices

1.  **HTTP Focus:** Handlers manage HTTP request/response lifecycle.
2.  **Separate Business Logic:** Place core logic in service/DB layers.
3.  **Use OpenAPI Types:** Ensure handlers conform to the API contract.
    - Type request bodies, parameters, and responses using generated types.
    - Adhere to specified success and error response schemas.
4.  **Error Handling:** Handle _expected_ errors returned from services by mapping them to appropriate HTTP responses. Let _unexpected_ errors (thrown) propagate to the central error handler via `createHandler`.
5.  **File Structure:** Follow the "one handler per file" structure within feature directories.
