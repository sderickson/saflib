[**@saflib/jobs-db**](../../index.md)

---

# Variable: cancelByOriginalRequestIdJob()

> `const` **cancelByOriginalRequestIdJob**: (`dbKey`, `params`) => `Promise`\<`ReturnsError`\<`object`[], `never`>>\>\>

Cancel every pending/retrying job in a chain
(`terminal_reason: cancelled-by-chain`). Running and terminal jobs are left
alone. Returns the cancelled rows (possibly empty).

## Parameters

| Parameter | Type                                 |
| --------- | ------------------------------------ |
| `dbKey`   | `symbol`                             |
| `params`  | `CancelByOriginalRequestIdJobParams` |

## Returns

`Promise`\<`ReturnsError`\<`object`[], `never`\>\>
