# Adding New Routes

## Implementation Basics

- Use "createHandler" for each handler. It ensures errors are caught and passed to middleware, and that handlers use Promises.
- Files in the /routes folder should export a router which the app.ts uses
- For type checking, use "RequestSchema" and "ResponseSchema" from the openapi specs library. Have them enforce the types you receive and that you send.
- Handled errors should send status code and response objects directly. Unhandled errors should be passed to `next`.
- Routes should be in charge of http concerns. Ideally don't pass the req, res, or next parameters around, so that it's clear what parameters are being used and what response codes may occur.

Example:

```typescript
// In your routes/<>.ts file
import { Router } from "express";
import { createHandler } from "@saflib/node-express";
import type { RequestSchema, ResponseSchema } from "@your-project/specs-apis";

export const exampleRouter = Router();

router.get(
  "/route",
  createHandler(async (req) => {
    const exampleRequest: RequestSchema<"exampleRoute"> = req.body;

    // I/O like db requests happens here
    const exampleResponse: ResponseSchema<"exampleRoute", 200> = {
      /* ... */
    };

    return exampleResponse;
  }),
);

// In your app.ts file
app.use("/examples", exampleRouter);
```

The `createHandler` function:

- Automatically handles Promise rejection
- Passes errors to Express error handler
- Makes the code cleaner by removing try/catch blocks
- Ensures consistent error handling across all routes
