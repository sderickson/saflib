[**@saflib/openapi**](../index.md)

***

# Type Alias: ExtractRequestBody\<Ops\>

> **ExtractRequestBody**\<`Ops`\> = `{ [OpKey in keyof Ops]: Ops[OpKey]["requestBody"] extends { content: { application/json: any } } ? Ops[OpKey]["requestBody"]["content"]["application/json"] : never }`

## Type Parameters

| Type Parameter |
| ------ |
| `Ops` *extends* `Record`\<`string`, `any`\> |
