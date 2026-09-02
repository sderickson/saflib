[**@saflib/express**](../../../index.md)

---

# Interface: CreateChangeEventMiddlewareOptions

## Properties

### emitter

> **emitter**: `ChangeEmitter`

Publishes change hints for org SSE subscribers.

---

### getOrgId()

> **getOrgId**: (`req`) => `undefined` \| `null` \| `string`

Resolve the org channel for this request.
Return undefined/null/empty to skip publishing.

#### Parameters

| Parameter | Type      |
| --------- | --------- |
| `req`     | `Request` |

#### Returns

`undefined` \| `null` \| `string`

---

### skipOperationIds?

> `optional` **skipOperationIds**: `ReadonlySet`\<`string`\> \| readonly `string`[]

operationIds that should never publish (e.g. noisy CSP reports).
