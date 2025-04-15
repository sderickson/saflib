# Database Packages

This guide outlines best practices for creating packages that manage data storage in the monorepo.

## Data Storage Location

Packages that manage data (such as SQLite databases, session storage, etc.) should:

1. Store their data in a `data/` directory within the package
2. Handle the data path internally by default rather than requiring it to be passed in
3. Create the `data/` directory if it doesn't exist
4. Add `data/` to `.gitignore` to prevent committing data files

Example structure:

```
package-name/
├── package.json
├── src/
│   └── index.ts
└── data/           # Data storage directory
    └── .gitkeep    # To ensure directory exists in git
```

## Testing Behavior

When `NODE_ENV` is set to "TEST":

1. Use in-memory storage by default
2. Each test should start with a fresh state
3. No data should be persisted to disk

Example implementation:

```typescript
export class Database {
  private db: DatabaseImpl;

  constructor() {
    if (process.env.NODE_ENV === "TEST") {
      this.db = new InMemoryDatabase();
    } else {
      this.db = new SQLiteDatabase("./data/database.sqlite");
    }
  }
}
```
