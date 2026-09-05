[**@saflib/notify**](../index.md)

---

# Class: InProcessChangeEmitter

Single-process ChangeEmitter with per-org subscribers and a small ring buffer
for Last-Event-ID reconnect replay.

## Implements

- [`ChangeEmitter`](../interfaces/ChangeEmitter.md)

## Constructors

### Constructor

> **new InProcessChangeEmitter**(`options`): `InProcessChangeEmitter`

#### Parameters

| Parameter | Type                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| `options` | [`InProcessChangeEmitterOptions`](../interfaces/InProcessChangeEmitterOptions.md) |

#### Returns

`InProcessChangeEmitter`

## Methods

### getEventsAfter()

> **getEventsAfter**(`orgId`, `lastEventId`): [`ChangeEventWithId`](../interfaces/ChangeEventWithId.md)[]

Events strictly after `lastEventId` still held in the per-org ring buffer.
Empty when the id is unknown, expired, or at the tip.

#### Parameters

| Parameter     | Type     |
| ------------- | -------- |
| `orgId`       | `string` |
| `lastEventId` | `string` |

#### Returns

[`ChangeEventWithId`](../interfaces/ChangeEventWithId.md)[]

#### Implementation of

[`ChangeEmitter`](../interfaces/ChangeEmitter.md).[`getEventsAfter`](../interfaces/ChangeEmitter.md#geteventsafter)

---

### publish()

> **publish**(`event`): `void`

Publish a change for the event's `org_id` channel.

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `event`   | [`ChangeEvent`](../interfaces/ChangeEvent.md) |

#### Returns

`void`

#### Implementation of

[`ChangeEmitter`](../interfaces/ChangeEmitter.md).[`publish`](../interfaces/ChangeEmitter.md#publish)

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

#### Implementation of

[`ChangeEmitter`](../interfaces/ChangeEmitter.md).[`subscribe`](../interfaces/ChangeEmitter.md#subscribe)
