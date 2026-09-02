[**@saflib/workflows**](../index.md)

---

# Function: resolveOffshootInitContext()

> **resolveOffshootInitContext**(`opts`): [`OffshootInitContext`](../type-aliases/OffshootInitContext.md)

Resolve offshoot scaffold paths.

- `cwd` is usually the product root (e.g. `./tmp`).
- `parent` defaults to `./service/{layer}` (the weave host).
- Offshoot lands at `{product}/{offshootName}/{layer}`.

## Parameters

| Parameter           | Type                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `opts`              | \{ `cwd`: `string`; `layer`: [`OffshootLayer`](../type-aliases/OffshootLayer.md); `offshootName`: `string`; `parent?`: `string`; \} |
| `opts.cwd`          | `string`                                                                                                                            |
| `opts.layer`        | [`OffshootLayer`](../type-aliases/OffshootLayer.md)                                                                                 |
| `opts.offshootName` | `string`                                                                                                                            |
| `opts.parent?`      | `string`                                                                                                                            |

## Returns

[`OffshootInitContext`](../type-aliases/OffshootInitContext.md)
