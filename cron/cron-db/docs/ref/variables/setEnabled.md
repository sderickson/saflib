[**@saflib/cron-db**](../index.md)

---

# Variable: setEnabled()

> `const` **setEnabled**: (`dbKey`, `jobName`, `enabled`, `enabledBy?`) => `Promise`\<[`SetEnabledResult`](../type-aliases/SetEnabledResult.md)\>

Upsert enabled flag for a cron job.
When enabling, pass `enabledBy` (Kratos identity id) to record authority.
When disabling, `enabled_by` is retained as an audit trail of who last held authority.

## Parameters

| Parameter    | Type               |
| ------------ | ------------------ |
| `dbKey`      | `symbol`           |
| `jobName`    | `string`           |
| `enabled`    | `boolean`          |
| `enabledBy?` | `null` \| `string` |

## Returns

`Promise`\<[`SetEnabledResult`](../type-aliases/SetEnabledResult.md)\>
