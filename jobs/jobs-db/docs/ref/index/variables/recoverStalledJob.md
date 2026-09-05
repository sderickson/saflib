[**@saflib/jobs-db**](../../index.md)

---

# Variable: recoverStalledJob()

> `const` **recoverStalledJob**: (`dbKey`, `params`) => `Promise`\<`ReturnsError`\<`object`[], `never`>>\>\>

Recover stalled deliveries: running jobs in `ids` become `retrying` if
attempts remain, else `dead` with `terminal_reason: exhausted`.
Returns the affected rows.

## Parameters

| Parameter | Type                      |
| --------- | ------------------------- |
| `dbKey`   | `symbol`                  |
| `params`  | `RecoverStalledJobParams` |

## Returns

`Promise`\<`ReturnsError`\<`object`[], `never`\>\>
