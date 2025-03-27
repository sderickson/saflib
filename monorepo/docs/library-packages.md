# Library Packages

This guide outlines best practices for creating reusable library packages in the monorepo.

## Interface Design

1. **Type Management**

   - It's acceptable to propagate types from dependencies when they represent core domain concepts
   - Example: Database ORM types can be re-exported if they match your domain model

   ```typescript
   // ✅ Good: Propagating ORM types that match your domain
   import { users } from "./schema.ts";
   export type User = typeof users.$inferSelect;
   export type NewUser = typeof users.$inferInsert;
   ```

2. **Error Handling**

   - Never propagate dependency errors directly to consumers
   - Catch and transform errors into library-specific error types
   - Example:

   ```typescript
   // ❌ Bad: Propagating SQLite errors
   async createUser(data: NewUser) {
     return await db.insert(users).values(data);
   }

   // ✅ Good: Transforming to library-specific errors
   class DatabaseError extends Error {
     constructor(message: string, cause?: unknown) {
       super(message);
       this.name = "DatabaseError";
       this.cause = cause;
     }
   }

   async createUser(data: NewUser) {
     try {
       return await db.insert(users).values(data);
     } catch (error) {
       throw new DatabaseError("Failed to create user", error);
     }
   }
   ```

3. **Query Abstraction**
   - Instead of exposing raw database queries, provide specific methods for common operations
   - Encapsulate complex queries within the library
   - Make the interface domain-focused rather than data-access focused

## Package Structure

1. **Public API Organization**

   - Keep all public exports in the root directory
   - Use `package.json` exports field to explicitly define public API
   - Example:

   ```json
   {
     "exports": {
       ".": "./src/index.ts",
       "./types": "./types.ts",
       "./errors": "./errors.ts"
     }
   }
   ```

2. **Directory Structure**
   ```
   package-name/
   ├── package.json
   ├── types.ts           # Public types
   ├── errors.ts         # Public error types
   ├── index.ts          # Main entry point
   └── src/              # Private implementation
       ├── db.ts         # Database operations
       ├── schema.ts     # Database schema
       └── utils.ts      # Internal utilities
   ```

## Testing

1. **Interface Testing**

   - Test the public interface thoroughly
   - Mock internal dependencies
   - Focus on behavior, not implementation

2. **Example Test**

   ```typescript
   describe("AuthDb", () => {
     it("creates a user", async () => {
       const db = new AuthDb();
       const user = await db.createUser({
         email: "test@example.com",
         name: "Test User",
       });
       expect(user).toMatchObject({
         email: "test@example.com",
         name: "Test User",
       });
     });

     it("handles database errors appropriately", async () => {
       const db = new AuthDb();
       await expect(
         db.createUser({
           /* invalid data */
         }),
       ).rejects.toThrow(DatabaseError);
     });
   });
   ```
