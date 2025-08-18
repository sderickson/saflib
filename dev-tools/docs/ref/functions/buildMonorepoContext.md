[**@saflib/dev-tools**](../index.md)

***

# Function: buildMonorepoContext()

> **buildMonorepoContext**(`rootDir?`): [`MonorepoContext`](../interfaces/MonorepoContext.md)

Defined in: [src/workspace.ts:188](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L188)

Creates a MonorepoContext. If no rootdir is provided, it will find the first
parent directory with a package-lock.json and use that as the root, effectively
returning "this" package's monorepo context.

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

`rootDir?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

[`MonorepoContext`](../interfaces/MonorepoContext.md)
