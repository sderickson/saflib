[**@saflib/drizzle-sqlite3**](../../index.md)

***

# Function: queryWrapper()

> **queryWrapper**\<`T`, `A`\>(`queryFunc`): (...`args`) => `Promise`\<`T`\>

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

`T`

</td>
</tr>
<tr>
<td>

`A` *extends* `any`[]

</td>
</tr>
</tbody>
</table>

## Parameters

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

`queryFunc`

</td>
<td>

(...`args`) => `Promise`\<`T`\>

</td>
</tr>
</tbody>
</table>

## Returns

> (...`args`): `Promise`\<`T`\>

### Parameters

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

...`args`

</td>
<td>

`A`

</td>
</tr>
</tbody>
</table>

### Returns

`Promise`\<`T`\>
