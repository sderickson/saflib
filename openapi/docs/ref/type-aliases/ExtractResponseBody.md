[**@saflib/openapi**](../index.md)

***

# Type Alias: ExtractResponseBody\<Ops\>

> **ExtractResponseBody**\<`Ops`\> = `{ [OpKey in keyof Ops]: { [StatusCode in keyof Ops[OpKey]["responses"]]: Ops[OpKey]["responses"][StatusCode] extends { content: { application/json: any } } ? Ops[OpKey]["responses"][StatusCode]["content"]["application/json"] : never } }`

Convenience type to lookup the response body by operationId.

## Type Parameters

| Type Parameter |
| ------ |
| `Ops` *extends* `Record`\<`string`, `any`\> |

## Example

```typescript

// In your spec package
import type { operations } from "./dist/openapi.d.ts";
export type MyApiResponseBody = ExtractResponseBody<operations>;

// In your API route handler
const responseBody: MyApiResponseBody["myOperationId"][200] = {
  success: true,
  message: "Success",
};
```
