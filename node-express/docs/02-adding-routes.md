# Routes

## Implementation Basics

- Use `createHandler` for each route handler. It ensures errors are caught and passed to middleware, and that handlers use Promises.
- Each route handler should be in its own file in the `/routes` folder
- Route handlers should be combined in a central `index.ts` file that exports a router
- For type checking, use the appropriate request and response types from your spec library (e.g., `AuthRequest["operationId"]` and `AuthResponse["operationId"][statusCode]`)
- Handled errors should send status code and response objects directly. Unhandled errors should be passed to `next`
- Routes should be in charge of HTTP concerns. Keep business logic separate from route handlers when possible

## Route Handler Structure

Each route handler should be in its own file and follow this pattern:

```typescript
// routes/auth-login.ts
import { createHandler } from "@saflib/node-express";
import { Request, Response, NextFunction } from "express";
import { type AuthRequest, type AuthResponse } from "@saflib/auth-spec"; // Or the appropriate spec package

export const loginHandler = createHandler(async function (
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Type the request body
  const loginRequest: AuthRequest["loginUser"] = req.body;

  // Access injected services via req (e.g., req.db)

  // Handle the request
  try {
    // Business logic here
    const result = await req.db.someOperation();

    // Send typed response
    const response: AuthResponse["loginUser"][200] = result;
    res.json(response);
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

Example of proper error handling with typed requests and responses:

```typescript
import { type AuthRequest, type AuthResponse } from "@saflib/auth-spec"; // Or the appropriate spec package

export const exampleHandler = createHandler(async function (req, res, next) {
  // Type the request body
  const request: AuthRequest["exampleOperation"] = req.body;

  // Handle expected errors directly with typed responses
  if (!request.email) {
    const errorResponse: AuthResponse["exampleOperation"][400] = {
      error: "Email is required",
    };
    return res.status(400).json(errorResponse);
  }

  try {
    // Business logic that might throw unexpected errors
    const result = await someAsyncOperation();
    const successResponse: AuthResponse["exampleOperation"][200] = result;
    res.json(successResponse);
  } catch (error) {
    // Pass unexpected errors to next
    next(error);
  }
});
```

Example of handling known database errors with typed requests and responses:

```typescript
import { type AuthRequest, type AuthResponse } from "@saflib/auth-spec";

export const registerHandler = createHandler(async function (req, res, next) {
  // Type the request body
  const registerRequest: AuthRequest["registerUser"] = req.body;

  try {
    const user = await req.db.users.create({
      email: registerRequest.email,
      password: registerRequest.password,
    });
    const successResponse: AuthResponse["registerUser"][200] = user;
    res.status(201).json(successResponse);
  } catch (error) {
    // Handle known database errors using custom error types
    if (error instanceof req.db.users.EmailConflictError) {
      const errorResponse: AuthResponse["registerUser"][409] = {
        error: "Email already exists",
      };
      return res.status(409).json(errorResponse);
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

3. Use TypeScript types for request/response validation:

   - Import the appropriate request and response types from your spec library (e.g., `AuthRequest` and `AuthResponse`)
   - Type request bodies using `AuthRequest["operationId"]`
   - Type responses using `AuthResponse["operationId"][statusCode]`
   - Use `error` field for error responses instead of `message`
   - Include `success` field in success responses when appropriate

4. Keep route handlers small and focused on a single responsibility

5. Use middleware for cross-cutting concerns like authentication and logging
