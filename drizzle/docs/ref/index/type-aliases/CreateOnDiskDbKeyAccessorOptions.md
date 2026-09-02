[**@saflib/drizzle**](../../index.md)

---

# Type Alias: CreateOnDiskDbKeyAccessorOptions

> **CreateOnDiskDbKeyAccessorOptions** = `object`

## Properties

### connect()

> **connect**: (`options?`) => [`DbKey`](DbKey.md)

`DbManager.connect` (or compatible) from the owning DB package.

#### Parameters

| Parameter  | Type                                      |
| ---------- | ----------------------------------------- |
| `options?` | [`DbOptions`](../interfaces/DbOptions.md) |

#### Returns

[`DbKey`](DbKey.md)

---

### dataDir?

> `optional` **dataDir**: `string` \| () => `string`

Absolute data directory. Defaults to `<dirname(packageUrl)>/data`.
Use a function when the root can change (tests / seal data mounts).

---

### filePrefix

> **filePrefix**: `string`

Filename stem before `-${DEPLOYMENT_NAME}.sqlite`
(e.g. `"cron-db"` → `cron-db-development.sqlite`).

---

### packageUrl

> **packageUrl**: `string`

Calling module's `import.meta.url` (or any file URL under the package).
