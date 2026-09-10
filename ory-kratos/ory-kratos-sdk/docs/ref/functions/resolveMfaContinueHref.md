[**@saflib/ory-kratos-sdk**](../index.md)

---

# Function: resolveMfaContinueHref()

> **resolveMfaContinueHref**(`flow`, `setupHref`): `string`

After probing `createBrowserLoginFlow({ aal: "aal2" })`, pick the continue URL:

- methods present → resume that login flow (step-up)
- no methods → `setupHref` (MFA enrollment)

## Parameters

| Parameter   | Type                                    |
| ----------- | --------------------------------------- |
| `flow`      | `Pick`\<`LoginFlow`, `"id"` \| `"ui"`\> |
| `setupHref` | `string`                                |

## Returns

`string`
