[**@saflib/openapi**](../../index.md)

---

# Function: assertNoRootResponseBodies()

> **assertNoRootResponseBodies**(`packageRoot`, `options`): `void`

Throw if any success JSON response puts a resource at the document root.
Pass current offenders in `allow` and remove entries as routes are migrated.

## Parameters

| Parameter     | Type                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| `packageRoot` | `string`                                                                                    |
| `options`     | [`AssertNoRootResponseBodiesOptions`](../type-aliases/AssertNoRootResponseBodiesOptions.md) |

## Returns

`void`
