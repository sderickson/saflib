[**@saflib/jobs-db**](../../index.md)

---

# Variable: countByOriginalRequestIdJob()

> `const` **countByOriginalRequestIdJob**: (`dbKey`, `params`) => `Promise`\<`ReturnsError`\<`number`, `never`>>\>\>

Count all jobs sharing an `original_request_id` (spawn-cap / lineage).

## Parameters

| Parameter | Type                                |
| --------- | ----------------------------------- |
| `dbKey`   | `symbol`                            |
| `params`  | `CountByOriginalRequestIdJobParams` |

## Returns

`Promise`\<`ReturnsError`\<`number`, `never`\>\>
