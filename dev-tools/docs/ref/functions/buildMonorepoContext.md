[**@saflib/dev-tools**](../index.md)

***

# Function: buildMonorepoContext()

> **buildMonorepoContext**(`rootDir?`): [`MonorepoContext`](../interfaces/MonorepoContext.md)

Defined in: [src/workspace.ts:191](https://github.com/sderickson/saflib/blob/08b450484447b76436131d9dcb342c3f616d8732/dev-tools/src/workspace.ts#L191)

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
