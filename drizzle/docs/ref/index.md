**@saflib/drizzle**

---

# @saflib/drizzle

## Classes

| Class                                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DbManager](classes/DbManager.md)                           | A class which mainly manages "connections" to the sqlite3 database and drizzle ORM. Any package which depends on this will create a single instance given the database schema and config, export the public interface, and be used by queries to access the drizzle ORM. This way the package which depends on `@saflib/drizzle` has full access to its database, but packages which depend on _it_ only have access to an opaque key which only database queries can use. |
| [HandledDatabaseError](classes/HandledDatabaseError.md)     | A subclass of `Error` which is used to indicate that an error was caught and handled by the database library. Database packages should subclass this error, and these are not necessarily considered bugs if they occur.                                                                                                                                                                                                                                                   |
| [UnhandledDatabaseError](classes/UnhandledDatabaseError.md) | A subclass of `Error` which is used to indicate that an error was _not_ caught and handled by the database library. The cause of the error is not propagated, since consumers of the database libary should not have access to underlying SQL issues.                                                                                                                                                                                                                      |

## Interfaces

| Interface                            | Description                                                    |
| ------------------------------------ | -------------------------------------------------------------- |
| [DbOptions](interfaces/DbOptions.md) | When a "connection" is created, these parameters are provided. |

## Type Aliases

| Type Alias                                                 | Description                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DbConnection](type-aliases/DbConnection.md)               | The result of calling `drizzle`, typed to the schema you connected to.                                                                                                                                      |
| [DbKey](type-aliases/DbKey.md)                             | A symbol returned when connecting to the database. This key should be provided to any queries used by the consumer of the package. This is the only way a database consumer may interact with the database. |
| [DbTransaction](type-aliases/DbTransaction.md)             | Convenience type; the `tx` object passed to the drizzle transaction callback, with a generic parameter for the schema.                                                                                      |
| [Equal](type-aliases/Equal.md)                             | To be used with "Expect" to check explicit table interfaces match Drizzle's inferred interfaces.                                                                                                            |
| [Expect](type-aliases/Expect.md)                           | To be used with "Equal" to check explicit table interfaces match Drizzle's inferred interfaces.                                                                                                             |
| [Schema](type-aliases/Schema.md)                           | Currently this package expects the schema to be an object where some values are the result of `sqliteTable` calls. Organize your schema in this fashion when creating your DbManager and such.              |
| [TransactionCallback](type-aliases/TransactionCallback.md) | Convenience type; the first parameter of the `transaction` method, with a generic parameter for the schema.                                                                                                 |

## Functions

| Function                                  | Description                                                                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [queryWrapper](functions/queryWrapper.md) | All queries should use this wrapper. It will catch and obfuscate unhandled errors, and rethrow handled errors, though really handled errors should be returned, not thrown. |
