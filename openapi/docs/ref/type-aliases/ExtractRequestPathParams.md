[**@saflib/openapi**](../index.md)

***

# Type Alias: ExtractRequestPathParams\<Ops\>

> **ExtractRequestPathParams**\<`Ops`\> = `{ [OpKey in keyof Ops]: Ops[OpKey]["parameters"]["path"] }`

## Type Parameters

| Type Parameter |
| ------ |
| `Ops` *extends* `Record`\<`string`, `any`\> |
