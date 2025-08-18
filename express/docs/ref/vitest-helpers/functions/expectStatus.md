[**@saflib/express**](../../index.md)

***

# Function: expectStatus()

> **expectStatus**(`response`, `expectedStatus`, `message?`): `void`

Helper function to check if a test response has the expected status code
and provides a more helpful error message if the test fails due to OpenAPI validation.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`response`

</td>
<td>

`Response`

</td>
<td>

The supertest response object

</td>
</tr>
<tr>
<td>

`expectedStatus`

</td>
<td>

`number`

</td>
<td>

The expected HTTP status code

</td>
</tr>
<tr>
<td>

`message?`

</td>
<td>

`string`

</td>
<td>

Optional custom error message

</td>
</tr>
</tbody>
</table>

## Returns

`void`
