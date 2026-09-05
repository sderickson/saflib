[**@saflib/express**](../../../index.md)

---

# Function: noStoreCacheControl()

> **noStoreCacheControl**(`_req`, `res`, `next`): `void`

Disallow storing responses in shared or private caches. Use for APIs that
return session-, tenant-, or user-specific data (RFC 7234).

## Parameters

| Parameter | Type           |
| --------- | -------------- |
| `_req`    | `Request`      |
| `res`     | `Response`     |
| `next`    | `NextFunction` |

## Returns

`void`
