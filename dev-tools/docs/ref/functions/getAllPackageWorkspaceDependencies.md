[**@saflib/dev-tools**](../index.md)

***

# Function: getAllPackageWorkspaceDependencies()

> **getAllPackageWorkspaceDependencies**(`packageName`, `monorepoContext`): `Set`\<`string`\>

Defined in: [src/workspace.ts:212](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L212)

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
