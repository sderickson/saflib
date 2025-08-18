[**@saflib/dev-tools**](../index.md)

***

# Function: getAllPackageWorkspaceDependencies()

> **getAllPackageWorkspaceDependencies**(`packageName`, `monorepoContext`): `Set`\<`string`\>

Defined in: [src/workspace.ts:215](https://github.com/sderickson/saflib/blob/08b450484447b76436131d9dcb342c3f616d8732/dev-tools/src/workspace.ts#L215)

Returns all direct and transitive "@saflib/*" dependencies for a given package.

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

`packageName`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`monorepoContext`

</td>
<td>

[`MonorepoContext`](../interfaces/MonorepoContext.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Set`\<`string`\>
