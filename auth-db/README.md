# @saflib/auth-db

Shared authentication database library for SAF services. This package provides a unified interface for managing user authentication data across different SAF services.

## Features

- User management
- Session handling
- SQLite-based storage using Drizzle ORM

## Usage

```typescript
import { AuthDB } from "@saflib/auth-db";

const db = new AuthDB({
  // configuration options
});

// Use the database
```

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Generate database migrations
npm run db:generate
```

## Dependencies

- Node.js v18+
- SQLite3
- Drizzle ORM
