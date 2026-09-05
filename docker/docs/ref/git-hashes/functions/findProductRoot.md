[**@saflib/docker**](../../index.md)

---

# Function: findProductRoot()

> **findProductRoot**(`startDir`): `string`

Product / workspace root: nearest ancestor with `package-lock.json`
(npm workspaces root). Falls back to the git root enclosing `startDir`.

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `startDir` | `string` |

## Returns

`string`
