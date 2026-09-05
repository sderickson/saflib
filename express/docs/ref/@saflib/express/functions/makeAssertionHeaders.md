[**@saflib/express**](../../../index.md)

---

# Function: makeAssertionHeaders()

> **makeAssertionHeaders**(`user`, `options`): `Record`\<`string`, `string`>\>

Signs an identity assertion for use in tests via `X-Saf-Identity-Assertion`.

Requires `SAF_INTERNAL_ASSERTION_KEYS` to be set (e.g. via `vi.stubEnv` in
test setup) to a value like `test:dGVzdC1zZWNyZXQ=`.

## Parameters

| Parameter             | Type                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `user`                | \{ `mfaCompleted?`: `boolean`; `userId`: `string`; \}                                             |
| `user.mfaCompleted?`  | `boolean`                                                                                         |
| `user.userId`         | `string`                                                                                          |
| `options`             | \{ `claims?`: `Record`\<`string`, `string`\>; `operationId`: `string`; `requestId?`: `string`; \} |
| `options.claims?`     | `Record`\<`string`, `string`\>                                                                    |
| `options.operationId` | `string`                                                                                          |
| `options.requestId?`  | `string`                                                                                          |

## Returns

`Record`\<`string`, `string`\>
