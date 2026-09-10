[**@saflib/express**](../../../index.md)

---

# Function: isInternalRequest()

> **isInternalRequest**(`req`): `boolean`

Returns whether `req` was tagged by [markInternal](markInternal.md).
Safe to call on any IncomingMessage; returns false when the tag is absent.

## Parameters

| Parameter | Type              |
| --------- | ----------------- |
| `req`     | `IncomingMessage` |

## Returns

`boolean`
