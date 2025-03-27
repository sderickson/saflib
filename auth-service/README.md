# @saflib/auth-service

Authentication service library for the SAF-2025 framework. This package provides a reusable authentication service that can be integrated into any SAF-2025 service.

## Installation

This package is part of the SAF-2025 monorepo. Add it as a dependency in your package.json:

```json
{
  "dependencies": {
    "@saflib/auth-service": "*"
  }
}
```

## Usage

```typescript
import { createAuthApp } from "@saflib/auth-service";

const app = createAuthApp();
app.listen(3000);
```

## Configuration

The library is configured through environment variables:

- `DOMAIN`: Domain for cookie settings (e.g. "example.com")
- `PROTOCOL`: "http" or "https"
- `NODE_ENV`: "development" or "production"
- `SESSION_SECRET`: Secret for session encryption

## API

### createAuthApp()

Creates a fully configured Express application with authentication middleware and routes.

Returns: `AuthApp` - An Express application with authentication configured

## Types

```typescript
import type { AuthApp, AuthConfig } from "@saflib/auth-service/types";
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```
