[**@saflib/express**](../index.md)

***

# Function: createHandler()

> **createHandler**(`handler`): (`req`, `res`, `next`) => `void`

Wrapper for Express handlers. Promisifies the handler, ensuring any uncaught
exceptions get passed to `next`.

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

`handler`

</td>
<td>

(`req`, `res`, `next`) => `Promise`\<`void`\>

</td>
</tr>
</tbody>
</table>

## Returns

> (`req`, `res`, `next`): `void`

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

`req`

</td>
<td>

`Request`

</td>
</tr>
<tr>
<td>

`res`

</td>
<td>

`Response`

</td>
</tr>
<tr>
<td>

`next`

</td>
<td>

`NextFunction`

</td>
</tr>
</tbody>
</table>

### Returns

`void`
