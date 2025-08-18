[**@saflib/drizzle-sqlite3**](../../index.md)

***

# Class: DbManager\<S, C\>

A class which mainly manages "connections" to the sqlite3 database and drizzle
ORM. Any package which depends on this will create a single instance given the
database schema and config, export the public interface, and be used by queries
to access the drizzle ORM. This way the package which depends on
`@saflib/drizzle-sqlite3` has full access to its database, but packages
which depend on *it* only have access to an opaque key which only database
queries can use.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`S` *extends* [`Schema`](../type-aliases/Schema.md)

</td>
</tr>
<tr>
<td>

`C` *extends* `Config`

</td>
</tr>
</tbody>
</table>

## Constructors

### Constructor

> **new DbManager**\<`S`, `C`\>(`schema`, `c`, `rootUrl`): `DbManager`\<`S`, `C`\>

#### Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`schema`

</td>
<td>

`S`

</td>
</tr>
<tr>
<td>

`c`

</td>
<td>

`C`

</td>
</tr>
<tr>
<td>

`rootUrl`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

#### Returns

`DbManager`\<`S`, `C`\>

## Methods

### connect()

> **connect**(`options?`): `symbol`

Creates a "connection" to a database.

If onDisk is true, the database will be created on disk, in a "data" folder, with the name of the current environment.
If onDisk is a string, the database will be created at the given (absolute) path.

#### Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

[`DbOptions`](../interfaces/DbOptions.md)

</td>
</tr>
</tbody>
</table>

#### Returns

`symbol`

***

### disconnect()

> **disconnect**(`key`): `boolean`

#### Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`key`

</td>
<td>

`symbol`

</td>
</tr>
</tbody>
</table>

#### Returns

`boolean`

***

### get()

> **get**(`key`): `undefined` \| [`DbConnection`](../type-aliases/DbConnection.md)\<`S`\>

#### Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`key`

</td>
<td>

`symbol`

</td>
</tr>
</tbody>
</table>

#### Returns

`undefined` \| [`DbConnection`](../type-aliases/DbConnection.md)\<`S`\>

***

### publicInterface()

> **publicInterface**(): `object`

#### Returns

##### connect()

> **connect**: (`options?`) => `symbol`

Creates a "connection" to a database.

If onDisk is true, the database will be created on disk, in a "data" folder, with the name of the current environment.
If onDisk is a string, the database will be created at the given (absolute) path.

###### Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

[`DbOptions`](../interfaces/DbOptions.md)

</td>
</tr>
</tbody>
</table>

###### Returns

`symbol`

##### disconnect()

> **disconnect**: (`key`) => `boolean`

###### Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`key`

</td>
<td>

`symbol`

</td>
</tr>
</tbody>
</table>

###### Returns

`boolean`
