[**@saflib/openapi**](../index.md)

***

# Type Alias: ExtractResponseBody\<Ops\>

> **ExtractResponseBody**\<`Ops`\> = `{ [OpKey in keyof Ops]: { [StatusCode in keyof Ops[OpKey]["responses"]]: Ops[OpKey]["responses"][StatusCode] extends { content: { application/json: any } } ? Ops[OpKey]["responses"][StatusCode]["content"]["application/json"] : never } }`

## Type Parameters

| Type Parameter |
| ------ |
| `Ops` *extends* `Record`\<`string`, `any`\> |
