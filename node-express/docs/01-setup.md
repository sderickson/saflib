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
│   ├── index.test.ts # Tests for main router
│   ├── [feature].ts  # Individual route modules
│   └── [feature].test.ts  # Tests for feature routes
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
   import app from "../app.ts";
   import { startServer } from "@saflib/node-express";

   startServer(app);
   ```

   `bin/healthcheck`:
   ```javascript
   #!/usr/bin/env node
   import { healthcheck } from "@saflib/node-express";

   healthcheck();
   ```

3. Create a `routes` directory to store your Express routers and their tests:
   ```
   routes/
   ├── index.ts        # Main router that combines all route modules
   ├── index.test.ts   # Tests for main router
   ├── [feature].ts    # Individual route modules
   └── [feature].test.ts  # Tests for feature routes
   ```

4. Set up your main `app.ts`:
   ```typescript
   import express from "express";
   import routes from "./routes/index.ts";

   const app = express();
   app.use(express.json());
   app.use("/", routes);

   export default app;
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

