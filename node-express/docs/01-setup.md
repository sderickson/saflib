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
├── routes/           # Top-level router mounting feature routers
│   ├── index.ts
│   └── [feature]/    # Directory for a specific feature's routes
│       ├── index.ts      # Feature router combining handlers
│       ├── get-all.ts    # Example handler for GET /feature
│       ├── get-by-id.ts  # Example handler for GET /feature/:id
│       ├── create.ts     # Example handler for POST /feature
│       └── ...           # Other handlers and their tests
├── context.ts        # Defines request context using AsyncLocalStorage
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

3. Create a `context.ts` file to define the request context structure:

   `context.ts`:

   ```typescript
   import { AsyncLocalStorage } from "async_hooks";
   import type { DatabaseInstance } from "@your-org/your-db-package"; // Adjust DB import
   // Import other context types as needed (e.g., Logger)

   export interface RequestContext {
     db: DatabaseInstance;
     // logger: Logger;
     // Optional: authenticated user info
     // auth?: { userId: string; }
   }

   export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();
   ```

4. Create a `routes` directory. Inside, create an `index.ts` to combine feature routers, and subdirectories for each feature:

   `routes/[feature]/get-by-id.ts` (Example handler):

   ```typescript
   import { createHandler } from "@saflib/node-express";
   import { asyncLocalStorage } from "../../context.ts";
   // Import spec types if needed

   export const getFeatureByIdHandler = createHandler(async (req, res) => {
     const ctx = asyncLocalStorage.getStore();
     if (!ctx) {
       throw new Error("Request context not found."); // Should not happen if middleware is set up
     }
     const { db /*, logger */ } = ctx;
     const featureId = req.params.id;

     // Example: Call a DB query function using the context's db instance
     // const { result, error } = await db.feature.getById(featureId);
     // Handle result/error...

     res.json({ id: featureId, message: "Feature details" });
   });
   ```

   `routes/[feature]/index.ts` (Example feature router):

   ```typescript
   import express from "express";
   import { getFeatureByIdHandler } from "./get-by-id.ts";
   // Import other handlers...

   const router = express.Router();
   router.get("/:id", getFeatureByIdHandler);
   // Add other routes for this feature...

   export { router as featureRouter };
   ```

   `routes/index.ts` (Main router):

   ```typescript
   import express from "express";
   import { featureRouter } from "./feature/index.ts";
   // Import other feature routers...

   const router = express.Router();
   router.use("/feature", featureRouter);
   // Mount other routers...

   export default router; // Export the main application router
   ```

5. Set up your main `app.ts` with a `createApp` function:

   ```typescript
   import { DatabaseInstance } from "@your-org/your-db-package"; // Adjust DB import
   import {
     createPreMiddleware, // Includes context initialization
     recommendedErrorHandlers,
     createContextMiddleware, // Use this helper
   } from "@saflib/node-express";
   import express from "express";
   import { asyncLocalStorage, RequestContext } from "./context.ts";
   import mainRouter from "./routes/index.ts"; // Import the main router

   export function createApp() {
     const app = express();
     app.set("trust proxy", 1);

     // Initialize database (outside middleware, as it's a singleton)
     const db = new DatabaseInstance();

     // Apply context middleware FIRST
     app.use(
       createContextMiddleware<RequestContext>(asyncLocalStorage, () => {
         // This function creates the context for each request
         return {
           db,
           // Initialize other context items like logger
         };
       }),
     );

     // Apply other recommended pre-route middleware
     app.use(createPreMiddleware());

     // Add routes (using the main router)
     app.use(mainRouter);

     // Apply recommended error handlers (should be last)
     app.use(recommendedErrorHandlers);

     return app;
   }
   ```

6. Add the following scripts to your `package.json`:

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

Dependencies defined in your `RequestContext` (like the `db` instance above) are accessed within route handlers via `asyncLocalStorage.getStore()`:

```typescript
// Example route handler (e.g., routes/[feature]/get-by-id.ts)
import { createHandler } from "@saflib/node-express";
import { asyncLocalStorage } from "../../context.ts";
// Import the DB type if needed for specific operations

export const getFeatureByIdHandler = createHandler(async (req, res) => {
  // Get the context for the current request
  const ctx = asyncLocalStorage.getStore();
  if (!ctx) {
    // This check is mostly for type safety; middleware should ensure it exists
    throw new Error("Request context not found.");
  }

  // Access items from the context
  const db = ctx.db;
  const featureId = req.params.id;

  // Use the db instance
  // const { result, error } = await db.feature.getById(featureId);

  // ... rest of handler logic
});
```
