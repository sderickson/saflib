# @saflib/auth-db

Shared authentication database library for SAF services. This package provides a unified interface for managing user authentication data across different SAF services.

## Features

- User management
- Email authentication
- SQLite-based storage using Drizzle ORM

## Usage

```typescript
import { AuthDB } from "@saflib/auth-db";

const db = new AuthDB({
  // configuration options
});

// Use the database
await db.users.create({ email: "user@example.com", createdAt: new Date() });
await db.emailAuth.create({
  userId: 1,
  email: "user@example.com",
  passwordHash: new Uint8Array(),
});
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

## Notes

- Session management is handled by the auth service using `better-sqlite3-session-store`
- This package focuses on core user identity and authentication data
- Different services can implement their own session management strategies
