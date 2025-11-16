[**@saflib/openapi**](../../index.md)

---

# Type Alias: ExtractRequestBody\<Ops\>

> **ExtractRequestBody**\<`Ops`\> = `{ [OpKey in keyof Ops]: Ops[OpKey]["requestBody"] extends { content: { application/json: any } } ? Ops[OpKey]["requestBody"]["content"]["application/json"] : never }`

Convenience type to lookup the request body by operationId.

## Type Parameters

| Type Parameter                              |
| ------------------------------------------- |
| `Ops` _extends_ `Record`\<`string`, `any`\> |

## Example

```typescript
// In your spec package
import type { operations } from "./dist/openapi.d.ts";
export type MyApiRequestBody = ExtractRequestBody<operations>;

// In your API route handler
const requestBody: MyApiRequestBody["myOperationId"] = req.body;
```
