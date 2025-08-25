[**@saflib/openapi**](../index.md)

***

# Type Alias: ExtractRequestQueryParams\<Ops\>

> **ExtractRequestQueryParams**\<`Ops`\> = `{ [OpKey in keyof Ops]: Ops[OpKey]["parameters"]["query"] }`

Convenience type to lookup the query params by operationId.

## Type Parameters

| Type Parameter |
| ------ |
| `Ops` *extends* `Record`\<`string`, `any`\> |

## Example

```typescript

// In your spec package
import type { operations } from "./dist/openapi.d.ts";
export type MyApiQueryParams = ExtractRequestQueryParams<operations>;

// In your API route handler
const queryParams: MyApiQueryParams["myOperationId"] = req.query;
```
