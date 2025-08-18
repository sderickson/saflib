**@saflib/drizzle-sqlite3**

***

# @saflib/drizzle-sqlite3

## Classes

<table>
<thead>
<tr>
<th>Class</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[DbManager](index/classes/DbManager.md)

</td>
<td>

A class which mainly manages "connections" to the sqlite3 database and drizzle
ORM. Any package which depends on this will create a single instance given the
database schema and config, export the public interface, and be used by queries
to access the drizzle ORM. This way the package which depends on
`@saflib/drizzle-sqlite3` has full access to its database, but packages
which depend on *it* only have access to an opaque key which only database
queries can use.

</td>
</tr>
<tr>
<td>

[HandledDatabaseError](index/classes/HandledDatabaseError.md)

</td>
<td>

A subclass of `Error` which is used to indicate that an error was caught and
handled by the database library. Database packages should subclass this error,
and these are not necessarily considered bugs if they occur.

</td>
</tr>
<tr>
<td>

[UnhandledDatabaseError](index/classes/UnhandledDatabaseError.md)

</td>
<td>

A subclass of `Error` which is used to indicate that an error was *not* caught
and handled by the database library. The cause of the error is not propagated,
since consumers of the database libary should not have access to underlying
SQL issues.

When there is an UnhandledDatabaseError, the database library should be updated
to handle it. Any occurence should be considered a bug.

</td>
</tr>
</tbody>
</table>

## Interfaces

<table>
<thead>
<tr>
<th>Interface</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[DbOptions](index/interfaces/DbOptions.md)

</td>
<td>

When a "connection" is created, these parameters are provided.

</td>
</tr>
</tbody>
</table>

## Type Aliases

<table>
<thead>
<tr>
<th>Type Alias</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[DbConnection](index/type-aliases/DbConnection.md)

</td>
<td>

The result of calling `drizzle`, typed to the schema you connected to.

</td>
</tr>
<tr>
<td>

[DbKey](index/type-aliases/DbKey.md)

</td>
<td>

A symbol returned when connecting to the database. This key should be provided
to any queries used by the consumer of the package. This is the only way a
database consumer may interact with the database.

</td>
</tr>
<tr>
<td>

[DbTransaction](index/type-aliases/DbTransaction.md)

</td>
<td>

Convenience type; the `tx` object passed to the drizzle transaction callback,
with a generic parameter for the schema.

</td>
</tr>
<tr>
<td>

[Schema](index/type-aliases/Schema.md)

</td>
<td>

Currently this package expects the schema to be an object where some values
are the result of `sqliteTable` calls. Organize your schema in this fashion
when creating your DbManager and such.

</td>
</tr>
<tr>
<td>

[TransactionCallback](index/type-aliases/TransactionCallback.md)

</td>
<td>

Convenience type; the first parameter of the `transaction` method, with a
generic parameter for the schema.

</td>
</tr>
</tbody>
</table>

## Functions

<table>
<thead>
<tr>
<th>Function</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[queryWrapper](index/functions/queryWrapper.md)

</td>
<td>

&hyphen;

</td>
</tr>
</tbody>
</table>
