[**@saflib/drizzle**](../../index.md)

---

# Function: createOnDiskDbKeyAccessor()

> **createOnDiskDbKeyAccessor**(`options`): `object`

Lazy singleton for package-owned SQLite files (`cron-db`, `jobs-db`, `audit-db`, …).

Creates the parent `data/` directory outside tests, then calls `connect({ onDisk })`.

## Parameters

| Parameter | Type                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| `options` | [`CreateOnDiskDbKeyAccessorOptions`](../type-aliases/CreateOnDiskDbKeyAccessorOptions.md) |

## Returns

`object`

### getDbKey()

> **getDbKey**: () => `symbol`

#### Returns

`symbol`

### getSqlitePath()

> **getSqlitePath**: () => `string`

#### Returns

`string`
