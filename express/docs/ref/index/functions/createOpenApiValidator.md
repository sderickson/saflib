[**@saflib/express**](../../index.md)

***

# Function: createOpenApiValidator()

> **createOpenApiValidator**(`apiSpec`): `OpenApiRequestHandler`[]

Creates OpenAPI validation middleware with a custom specification.
Only use this if you need to validate against a different OpenAPI spec.

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

`apiSpec`

</td>
<td>

`string` \| `DocumentV3`

</td>
</tr>
</tbody>
</table>

## Returns

`OpenApiRequestHandler`[]
