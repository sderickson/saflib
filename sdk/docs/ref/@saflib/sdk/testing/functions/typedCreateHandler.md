[**@saflib/sdk**](../../../../index.md)

***

# Function: typedCreateHandler()

> **typedCreateHandler**\<`Paths`\>(`__namedParameters`): `object`

Use to create a typed helper function for creating typesafe mock API handlers.

## Type Parameters

| Type Parameter |
| ------ |
| `Paths` *extends* `Record`\<`string`, `any`\> |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | \{ `subdomain`: `string`; \} |
| `__namedParameters.subdomain` | `string` |

## Returns

`object`

### createHandler()

> **createHandler**: \<`P`, `V`, `S`\>(`__namedParameters`) => `HttpHandler`

#### Type Parameters

| Type Parameter |
| ------ |
| `P` *extends* `string` \| `number` \| `symbol` |
| `V` *extends* `string` \| `number` \| `symbol` |
| `S` *extends* `number` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | \{ `handler`: (`request`) => `Promise`\<`undefined` \| `ExtractResponseBody`\<`Paths`\[`P`\]\[`V`\] *extends* `Record`\<`string`, `any`\> ? `any`\[`any`\] : `never`, `S`\>\>; `path`: `P`; `status`: `S`; `verb`: `V`; \} |
| `__namedParameters.handler` | (`request`) => `Promise`\<`undefined` \| `ExtractResponseBody`\<`Paths`\[`P`\]\[`V`\] *extends* `Record`\<`string`, `any`\> ? `any`\[`any`\] : `never`, `S`\>\> |
| `__namedParameters.path` | `P` |
| `__namedParameters.status` | `S` |
| `__namedParameters.verb` | `V` |

#### Returns

`HttpHandler`
