[**@saflib/workflows**](../index.md)

---

# Function: parsePackageName()

> **parsePackageName**(`packageName`, `input?`): [`ParsePackageNameOutput`](../interfaces/ParsePackageNameOutput.md)

Takes a package name and returns a breakdown based on conventions.

The package name format is [@organization-name/]service-name[-required-suffix].
If provided a required suffix, this function will enforce that the name ends with it.

## Parameters

| Parameter     | Type                                                              |
| ------------- | ----------------------------------------------------------------- |
| `packageName` | `string`                                                          |
| `input?`      | [`ParsePackageNameInput`](../interfaces/ParsePackageNameInput.md) |

## Returns

[`ParsePackageNameOutput`](../interfaces/ParsePackageNameOutput.md)
