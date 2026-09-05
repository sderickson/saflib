[**@saflib/jobs-db**](../../index.md)

---

# Variable: deleteExpiredTerminalJob()

> `const` **deleteExpiredTerminalJob**: (`dbKey`, `params`) => `Promise`\<`ReturnsError`\<`number`, `never`>>\>\>

Retention sweep: delete terminal jobs older than `cutoff`. Returns the
number of rows deleted.

## Parameters

| Parameter | Type                             |
| --------- | -------------------------------- |
| `dbKey`   | `symbol`                         |
| `params`  | `DeleteExpiredTerminalJobParams` |

## Returns

`Promise`\<`ReturnsError`\<`number`, `never`\>\>
