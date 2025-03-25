# @saflib/node-express

Shared Express.js utilities and middleware for SAF services. This library provides common functionality used across SAF Express.js applications, helping maintain consistency and reducing code duplication.

## Installation

This package is part of the SAF monorepo and is installed automatically through npm workspaces.

```typescript
import {
  requestId,
  httpLogger,
  createLogger,
  loggerInjector,
  logger,
  healthRouter,
  createHandler,
  auth,
  openApiValidator,
  createOpenApiValidator,
  notFoundHandler,
  errorHandler,
  healthcheck,
  startServer,
  recommendedPreMiddleware,
  recommendedErrorHandlers,
  createPreMiddleware,
} from "@saflib/node-express";
```

## Features

### Request ID Middleware

Extracts and makes available the request ID provided by Caddy. This ensures consistent request IDs across all services that handle a request, enabling effective distributed tracing.

```typescript
import express from "express";
import { requestId } from "@saflib/node-express";

const app = express();
app.use(requestId);

// The request ID is now available on req.id
app.use((req, res, next) => {
  console.log(`Request ID: ${req.id}`);
  next();
});
```

### Logging Middleware

Provides structured logging for Express applications with request context. The logger injector attaches a context-aware logger to the request object.

```typescript
import express from "express";
import { httpLogger, createLogger, loggerInjector } from "@saflib/node-express";

const app = express();

// Add HTTP request logging
app.use(httpLogger);

// Add logger to request object
app.use(loggerInjector);

// Create a custom logger
const logger = createLogger("my-service");
logger.info("Service starting up");

// Use request-scoped logger in routes
app.get("/example", (req, res) => {
  req.logger.info("Processing request", { path: req.path });
  res.send("Done");
});
```

### Health Check Endpoints

Ready-to-use health check endpoints for service monitoring.

```typescript
import express from "express";
import { healthRouter } from "@saflib/node-express";

const app = express();
app.use("/health", healthRouter);
```

### Auth Context Middleware

Middleware for handling authentication context. Adds an auth object to the request.

```typescript
import express from "express";
import { auth } from "@saflib/node-express";

const app = express();
app.use(auth);

// Auth information is now available on req.auth
app.get("/profile", (req, res) => {
  if (!req.auth.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ userId: req.auth.userId });
});
```

### OpenAPI Validation

Middleware for validating requests against OpenAPI specifications.

```typescript
import express from "express";
import { createOpenApiValidator } from "@saflib/node-express";

const app = express();
const validator = createOpenApiValidator("./openapi.yaml");
app.use(validator);
```

### Error Handler Middleware

Provides standardized error handling for Express applications. Automatically formats errors into a consistent JSON response format and handles different types of errors appropriately.

```typescript
import express from "express";
import { errorHandler, notFoundHandler } from "@saflib/node-express";

const app = express();

// Add your routes here

// Add the error handlers last
app.use(notFoundHandler);
app.use(errorHandler);
```

The error handler will format errors like this:

```json
{
  "error": {
    "message": "Resource not found",
    "status": 404
  }
}
```

### Middleware Composition

Pre-configured middleware bundles for common use cases, with the ability to create custom bundles.

```typescript
import express from "express";
import {
  recommendedPreMiddleware,
  recommendedErrorHandlers,
  createPreMiddleware,
} from "@saflib/node-express";

const app = express();

// Option 1: Use recommended pre-route middleware (logging, request ID, etc.)
app.use(recommendedPreMiddleware);

// Option 2: Create custom pre-middleware with specific configuration
const customPreMiddleware = createPreMiddleware({
  apiSpec
  parseAuthHeaders: true
});
app.use(customPreMiddleware);

// Add your routes here

// Add recommended error handlers
app.use(recommendedErrorHandlers);
```

### Server Command Utilities

Utilities for starting and managing Express servers.

```typescript
import { startServer } from "@saflib/node-express";
import express from "express";

const app = express();
// Configure your app...

// Start the server with graceful shutdown handling
startServer(app);
```

## Development

1. Install dependencies:

```bash
npm install
```

2. Run tests:

```bash
npm test
```

3. Run tests in watch mode:

```bash
npm test:watch
```

## Contributing

When adding new middleware or utilities:

1. Add comprehensive tests
2. Update this README with usage examples
3. Follow the existing error handling patterns
4. Ensure type safety with TypeScript
