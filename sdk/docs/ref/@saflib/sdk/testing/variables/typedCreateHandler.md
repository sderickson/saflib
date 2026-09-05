[**@saflib/sdk**](../../../../index.md)

---

# Variable: typedCreateHandler()

> `const` **typedCreateHandler**: \<`Paths`>\>() => `object`

Use to create a typed helper function for creating typesafe mock API handlers.

## Type Parameters

| Type Parameter                                |
| --------------------------------------------- |
| `Paths` _extends_ `Record`\<`string`, `any`\> |

## Returns

`object`

### createHandler()

> **createHandler**: \<`P`, `V`, `S`>\>(`{ path, verb, status, handler, }`) => `HttpHandler`

#### Type Parameters

| Type Parameter                     |
| ---------------------------------- |
| `P` _extends_ keyof `Paths`        |
| `V` _extends_ keyof `Paths`\[`P`\] |
| `S` _extends_ `number`             |

#### Parameters

| Parameter                                  | Type                                                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ path, verb, status, handler, }`         | \{ `handler`: (`request`) => `Promise`\<`ExtractResponseBody`\<...\[...\]\[`V`\] _extends_ `Record`\<`string`, `any`\> ? ...\[...\]\[`V`\] : `never`, `S`\> \| `undefined`\>; `path`: `P`; `status`: `S`; `verb`: `V`; \} |
| `{ path, verb, status, handler, }.handler` | (`request`) => `Promise`\<`ExtractResponseBody`\<...\[...\]\[`V`\] _extends_ `Record`\<`string`, `any`\> ? ...\[...\]\[`V`\] : `never`, `S`\> \| `undefined`\>                                                            |
| `{ path, verb, status, handler, }.path`    | `P`                                                                                                                                                                                                                       |
| `{ path, verb, status, handler, }.status`  | `S`                                                                                                                                                                                                                       |
| `{ path, verb, status, handler, }.verb`    | `V`                                                                                                                                                                                                                       |

#### Returns

`HttpHandler`
