[**@saflib/drizzle-sqlite3**](../../index.md)

***

# Type Alias: TransactionCallback\<S\>

> **TransactionCallback**\<`S`\> = `Parameters`\<[`DbConnection`](DbConnection.md)\<`S`\>\[`"transaction"`\]\>\[`0`\]

Convenience type; the first parameter of the `transaction` method, with a
generic parameter for the schema.

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

`S` *extends* [`Schema`](Schema.md)

</td>
</tr>
</tbody>
</table>
