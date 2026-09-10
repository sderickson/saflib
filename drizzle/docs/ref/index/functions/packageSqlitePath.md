[**@saflib/drizzle**](../../index.md)

---

# Function: packageSqlitePath()

> **packageSqlitePath**(`packageUrl`, `filePrefix`, `dataDir?`): `string`

Absolute SQLite path for a package-owned on-disk DB file.

Prefer [createOnDiskDbKeyAccessor](createOnDiskDbKeyAccessor.md) when you also need a lazy `DbKey`.

## Parameters

| Parameter    | Type                       |
| ------------ | -------------------------- |
| `packageUrl` | `string`                   |
| `filePrefix` | `string`                   |
| `dataDir?`   | `string` \| () => `string` |

## Returns

`string`
