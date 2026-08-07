[**@saflib/ory-kratos**](../index.md)

---

# Function: resolveAuthFromIdentityId()

> **resolveAuthFromIdentityId**(`userId`): `Promise`\<`null` \| `Auth`\>

Resolve a fresh `Auth` (from `@saflib/node`) for `userId` via the Kratos admin API.

Returns `null` when the identity is missing (404), inactive, or cannot be
mapped to Auth (e.g. no email trait). Does **not** set `mfaCompleted` —
that comes from the identity assertion (session-scoped).

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `userId`  | `string` |

## Returns

`Promise`\<`null` \| `Auth`\>
