[**@saflib/openapi**](../index.md)

***

# Type Alias: ExtractRequestQueryParams\<Ops\>

> **ExtractRequestQueryParams**\<`Ops`\> = `{ [OpKey in keyof Ops]: Ops[OpKey]["parameters"]["query"] }`

## Type Parameters

| Type Parameter |
| ------ |
| `Ops` *extends* `Record`\<`string`, `any`\> |
