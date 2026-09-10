[**@saflib/notify**](../index.md)

---

# Function: writeSseComment()

> **writeSseComment**(`target`, `comment`): `void`

Write an SSE comment line (useful as a keepalive heartbeat).
Format: `: <comment>\n\n`

## Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `target`  | [`SseWritable`](../interfaces/SseWritable.md) |
| `comment` | `string`                                      |

## Returns

`void`
