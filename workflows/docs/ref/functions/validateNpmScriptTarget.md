[**@saflib/workflows**](../index.md)

---

# Function: validateNpmScriptTarget()

> **validateNpmScriptTarget**(`params`): [`ValidateNpmScriptTargetResult`](../interfaces/ValidateNpmScriptTargetResult.md)

Validate that an npm workspace and script exist. Throws on invalid targets in
dry, checklist, print, run, and script modes (same policy as cd validation).

## Parameters

| Parameter | Type                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| `params`  | [`ValidateNpmScriptTargetParams`](../interfaces/ValidateNpmScriptTargetParams.md) |

## Returns

[`ValidateNpmScriptTargetResult`](../interfaces/ValidateNpmScriptTargetResult.md)
