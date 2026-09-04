[**@saflib/ory-kratos**](../../index.md)

---

# Function: makePostKratosActionHandler()

> **makePostKratosActionHandler**(`handler`): `Handler`

Mounts as `POST /kratos/action`. Parses JSON body, packages it as a
`KratosAction`, and forwards to `handler.onAction`.

No body-shape validation is performed: the body's shape is defined by the
jsonnet template configured in kratos.yml (currently a pass-through
`function(ctx) ctx`), and the application narrows what it cares about.
The only check is that the body is a JSON object (not null, not array,
not a primitive); anything else is a 400.

## Parameters

| Parameter | Type                                                          |
| --------- | ------------------------------------------------------------- |
| `handler` | [`KratosActionHandler`](../interfaces/KratosActionHandler.md) |

## Returns

`Handler`
