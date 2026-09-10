[**@saflib/notify**](../index.md)

---

# Interface: ChangeEmitter

Transport-agnostic change bus. In-process today; later Redis/NATS or HTTP.
Never import product-specific types into implementations.

## Methods

### getEventsAfter()

> **getEventsAfter**(`orgId`, `lastEventId`): [`ChangeEventWithId`](ChangeEventWithId.md)[]

Events strictly after `lastEventId` still held in the per-org ring buffer.
Empty when the id is unknown, expired, or at the tip.

#### Parameters

| Parameter     | Type     |
| ------------- | -------- |
| `orgId`       | `string` |
| `lastEventId` | `string` |

#### Returns

[`ChangeEventWithId`](ChangeEventWithId.md)[]

---

### publish()

> **publish**(`event`): `void`

Publish a change for the event's `org_id` channel.

#### Parameters

| Parameter | Type                            |
| --------- | ------------------------------- |
| `event`   | [`ChangeEvent`](ChangeEvent.md) |

#### Returns

`void`

---

### subscribe()

> **subscribe**(`orgId`, `listener`): () => `void`

Subscribe to an org channel. Returns an unsubscribe function.
Does not replay history — use `getEventsAfter` with Last-Event-ID for that.

#### Parameters

| Parameter  | Type                                                            |
| ---------- | --------------------------------------------------------------- |
| `orgId`    | `string`                                                        |
| `listener` | [`ChangeEventListener`](../type-aliases/ChangeEventListener.md) |

#### Returns

> (): `void`

##### Returns

`void`
