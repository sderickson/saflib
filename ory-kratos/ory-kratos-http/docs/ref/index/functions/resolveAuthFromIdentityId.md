[**@saflib/ory-kratos**](../../index.md)

---

# Function: resolveAuthFromIdentityId()

> **resolveAuthFromIdentityId**(`userId`): `Promise`\<`null` \| `Auth`\>

Resolve a fresh `Auth` (from `@saflib/node`) for `userId` via the Kratos admin API.

Returns `null` only when the identity is definitively unresolvable: missing
(404), inactive, or unmappable to Auth (e.g. no email trait). Transient
failures (network errors, non-404 error statuses) **throw** so callers can
surface a retryable 5xx instead of treating the user as gone — important for
the jobs runtime, where "auth unresolvable" is a terminal state.

Does **not** set `mfaCompleted` — that comes from the identity assertion
(session-scoped).

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `userId`  | `string` |

## Returns

`Promise`\<`null` \| `Auth`\>
