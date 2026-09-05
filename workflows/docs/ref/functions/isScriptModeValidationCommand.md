[**@saflib/workflows**](../index.md)

---

# Function: isScriptModeValidationCommand()

> **isScriptModeValidationCommand**(`command`, `args`): `boolean`

In script mode, skip agent-loop validation commands. Mechanical steps
(install, saf-specs generate, prettier, …) still run; typecheck/test of
unfinished scaffolds is asserted separately by CI harnesses when needed.

## Parameters

| Parameter | Type       |
| --------- | ---------- |
| `command` | `string`   |
| `args`    | `string`[] |

## Returns

`boolean`
