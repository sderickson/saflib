# Overview

Shared Express.js commands and middleware for SAF services. This library provides common functionality used across SAF Express.js applications, helping maintain consistency and reducing code duplication.

## Installation

This package is part of the SAF monorepo and is installed automatically through npm workspaces.

## Setup

To create a new Express.js service using this library, follow this recommended file structure:

```
service/
├── bin/
│   ├── www           # Server startup script
│   └── healthcheck   # Health check script
├── routes/
│   ├── index.ts      # Main router that combines all route modules
│   ├── [feature].ts  # Individual route handlers
│   └── [feature].test.ts  # Tests for individual routes
├── app.ts            # Main Express application setup
├── package.json      # Service dependencies and scripts
└── vitest.config.mts # Vitest configuration
```

1. Add the required dependencies to your service's `package.json`:

   ```json
   {
     "dependencies": {
       "@saflib/node-express": "*"
     },
     "devDependencies": {
       "@saflib/node-express-dev": "*"
     }
   }
   ```

2. Create a `bin` directory in your service root with two files:

   `bin/www`:

   ```javascript
   #!/usr/bin/env node
   import { createApp } from "../app.ts";
   import { startServer } from "@saflib/node-express";

   const app = createApp();
   startServer(app);
   ```

   `bin/healthcheck`:

   ```javascript
   #!/usr/bin/env node
   import { healthcheck } from "@saflib/node-express";

   healthcheck();
   ```

3. Create a `routes` directory to store your Express route handlers and their tests:

   ```
   routes/
   ├── index.ts        # Main router that combines all route modules
   ├── [feature].ts    # Individual route handlers (e.g., auth-login.ts)
   └── [feature].test.ts  # Tests for individual routes
   ```

   Example route handler (`routes/auth-login.ts`):

   ```typescript
   import { createHandler } from "@saflib/node-express";
   import { Request, Response, NextFunction } from "express";

   export const loginHandler = createHandler(async function (
     req: Request,
     res: Response,
     next: NextFunction,
   ) {
     // Route handler implementation
     // Access injected services via req (e.g., req.db)
   });
   ```

   Example route index (`routes/index.ts`):

   ```typescript
   import express from "express";
   import { loginHandler } from "./auth-login.ts";
   // Import other route handlers...

   const router = express.Router();
   router.post("/auth/login", loginHandler);
   // Add other routes...

   export { router as authRouter };
   ```

4. Set up your main `app.ts` with a `createApp` function:

   ```typescript
   import { AuthDB } from "@saflib/auth-db";
   import {
     createPreMiddleware,
     recommendedErrorHandlers,
   } from "@saflib/node-express";
   import express from "express";
   import { authRouter } from "./routes/index.ts";

   export function createApp() {
     const app = express();
     app.set("trust proxy", 1);

     // Apply recommended middleware
     app.use(createPreMiddleware());

     // Initialize database and store in app.locals
     const db = new AuthDB();
     app.locals.db = db; // Store the singleton instance in app.locals

     // Add routes
     app.use(authRouter);

     // Apply recommended error handlers
     app.use(recommendedErrorHandlers);

     return app;
   }
   ```

5. Add the following scripts to your `package.json`:
   ```json
   {
     "scripts": {
       "start": "node --experimental-strip-types ./bin/www",
       "healthcheck": "node --experimental-strip-types ./bin/healthcheck",
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

The library provides common middleware and utilities that can be imported from `@saflib/node-express`. For development tools and testing utilities, import from `@saflib/node-express-dev`.

### Accessing Dependencies in Routes

Dependencies stored in `app.locals` (like the `db` instance above) can be accessed within route handlers via `req.app.locals`:

```typescript
// Example route handler (e.g., routes/auth-login.ts)
import { createHandler } from "@saflib/node-express";
import { Request, Response, NextFunction } from "express";
import { AuthDB } from "@saflib/auth-db"; // Import the DB type if needed

export const loginHandler = createHandler(async function (
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Access injected services via req.app.locals
  const db: AuthDB = req.app.locals.db;

  // Use the db instance
  // const user = await db.users.findByCredentials(...);

  // ... rest of handler logic
});
```
