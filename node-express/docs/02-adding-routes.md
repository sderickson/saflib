# Routes

## Implementation Basics

- Use `createHandler` for each route handler. It ensures errors are caught and passed to middleware, and that handlers use Promises.
- Each route handler should be in its own file in the `/routes` folder
- Route handlers should be combined in a central `index.ts` file that exports a router
- For type checking, use "RequestSchema" and "ResponseSchema" from the openapi specs library when available
- Handled errors should send status code and response objects directly. Unhandled errors should be passed to `next`
- Routes should be in charge of HTTP concerns. Keep business logic separate from route handlers when possible

## Route Handler Structure

Each route handler should be in its own file and follow this pattern:

```typescript
// routes/auth-login.ts
import { createHandler } from "@saflib/node-express";
import { Request, Response, NextFunction } from "express";

export const loginHandler = createHandler(async function (
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Access injected services via req (e.g., req.db)

  // Handle the request
  try {
    // Business logic here
    const result = await req.db.someOperation();

    // Send response
    res.json(result);
  } catch (error) {
    // Pass unhandled errors to next
    next(error);
  }
});
```

## Route Organization

Create a central router file that combines all route handlers:

```typescript
// routes/index.ts
import express from "express";
import { loginHandler } from "./auth-login.ts";
import { registerHandler } from "./auth-register.ts";
// Import other handlers...

const router = express.Router();

// Define routes
router.post("/auth/login", loginHandler);
router.post("/auth/register", registerHandler);
// Add other routes...

export { router as authRouter };
```

## Error Handling

The `createHandler` function provides several benefits:

- Automatically handles Promise rejection
- Passes errors to Express error handler
- Makes the code cleaner by removing try/catch blocks
- Ensures consistent error handling across all routes

Example of proper error handling:

```typescript
export const exampleHandler = createHandler(async function (req, res, next) {
  // Handle expected errors directly
  if (!req.body.email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Business logic that might throw unexpected errors
    const result = await someAsyncOperation();
    res.json(result);
  } catch (error) {
    // Pass unexpected errors to next
    next(error);
  }
});
```

Example of handling known database errors:

```typescript
export const registerHandler = createHandler(async function (req, res, next) {
  try {
    const user = await req.db.users.create({
      email: req.body.email,
      password: req.body.password,
    });
    res.status(201).json(user);
  } catch (error) {
    // Handle known database errors using custom error types
    if (error instanceof req.db.users.EmailConflictError) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    // Pass unexpected errors to next
    next(error);
  }
});
```

## Best Practices

1. Keep route handlers focused on HTTP concerns:

   - Request validation
   - Response formatting
   - Status code selection
   - Error handling

2. Move business logic to separate service modules

3. Use TypeScript types for request/response validation when possible

4. Keep route handlers small and focused on a single responsibility

5. Use middleware for cross-cutting concerns like authentication and logging
