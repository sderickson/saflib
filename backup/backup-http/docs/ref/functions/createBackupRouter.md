[**@saflib/backup-http**](../index.md)

---

# Function: createBackupRouter()

> **createBackupRouter**(`backupFn`, `restoreFn`, `objectStore`): `Router`

## Parameters

| Parameter     | Type                                                   |
| ------------- | ------------------------------------------------------ |
| `backupFn`    | () => `Promise`\<`Readable`\>                          |
| `restoreFn`   | `undefined` \| (`backupStream`) => `Promise`\<`void`\> |
| `objectStore` | `ObjectStore`                                          |

## Returns

`Router`
