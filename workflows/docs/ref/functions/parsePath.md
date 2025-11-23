[**@saflib/workflows**](../index.md)

---

# Function: parsePath()

> **parsePath**(`path`, `input`): [`ParsePathOutput`](../interfaces/ParsePathOutput.md)

Takes a target path to a file and breaks it down into conventional parts for templating.

The path format is "./[required-prefix/][group-name/]target-name[required-suffix]".
This function will enforce required prefixes and suffixes. The suffix will usually just be a file extension.
To resolve the absolute path to the target directory, a cwd is required.

## Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `path`    | `string`                                            |
| `input`   | [`ParsePathInput`](../interfaces/ParsePathInput.md) |

## Returns

[`ParsePathOutput`](../interfaces/ParsePathOutput.md)
