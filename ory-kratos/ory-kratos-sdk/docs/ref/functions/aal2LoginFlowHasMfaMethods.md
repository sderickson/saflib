[**@saflib/ory-kratos-sdk**](../index.md)

---

# Function: aal2LoginFlowHasMfaMethods()

> **aal2LoginFlowHasMfaMethods**(`nodes`): `boolean`

True when an AAL2 login flow has at least one non-hidden interactive control
(second-factor field / button). Empty UI means the user has no MFA method yet.

## Parameters

| Parameter | Type                |
| --------- | ------------------- |
| `nodes`   | readonly `UiNode`[] |

## Returns

`boolean`
