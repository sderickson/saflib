[**@saflib/openapi**](../../index.md)

---

# Type Alias: ExtractRequestPathParams\<Ops\>

> **ExtractRequestPathParams**\<`Ops`\> = `{ [OpKey in keyof Ops]: Ops[OpKey]["parameters"]["path"] }`

Convenience type to lookup the path params by operationId.

## Type Parameters

| Type Parameter                              |
| ------------------------------------------- |
| `Ops` _extends_ `Record`\<`string`, `any`\> |

## Example

```typescript
// In your spec package
import type { operations } from "./dist/openapi.d.ts";
export type MyApiPathParams = ExtractRequestPathParams<operations>;

// In your API route handler
const pathParams: MyApiPathParams["myOperationId"] = req.params;
```
