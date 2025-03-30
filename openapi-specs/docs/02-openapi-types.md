# Generated Types

This guide explains how to work with and set up OpenAPI-generated types in a SAF monorepo.

## Overview

The monorepo uses OpenAPI specifications housed in packages like `@saflib/auth-spec` to generate TypeScript types that are shared between the service and client implementations. This ensures type safety across the entire application.

## Example Package Structure

- `@saflib/auth-spec`: Contains the OpenAPI specification and generated types
- `@saflib/auth-vue`: Consumes the generated types for client-side code
- `@saflib/auth-node`: Consumes the generated types for server-side code (TODO)

## Generation

Types, JSON, and HTML files are generated from OpenAPI YAML specifications. To do this, run:

```bash
npm run generate
```

## Using Generated Types

### In Spec Packages

1. Import types from the generated file:

```typescript
import type { components, paths, operations } from "./dist/openapi.d.ts";
```

2. Export specific types for consumers:

```typescript
export type { paths, components, operations } from "./dist/openapi.d.ts";

// Re-export specific schema types
export type LoginRequest = components["schemas"]["LoginRequest"];
export type UserResponse = components["schemas"]["UserResponse"];
```

### In Client Packages

1. Import types from the spec package:

```typescript
import type { components } from "@saflib/auth-spec";

// Use schema types
type LoginRequest = components["schemas"]["LoginRequest"];
```

2. Use types with API clients:

```typescript
import createClient from "openapi-fetch";
import type { paths } from "@saflib/auth-spec";

export const client = createClient<paths>({
  baseUrl: `${document.location.protocol}//api.${document.location.host}`,
  credentials: "include",
});
```

## Best Practices

1. **Type Exports**

   - Always export types through the package's main entry point
   - Use type aliases for commonly used schema types
   - Keep type exports focused and minimal

2. **Type Imports**

   - Import from the package, not directly from generated files
   - Use type imports to avoid runtime overhead
   - Prefer importing specific types over entire namespaces

3. **Type Updates**
   - Run type generation after updating OpenAPI specs
   - Update dependent packages to use new types
   - Test type changes across the monorepo

## Common Issues

1. **Missing Types**

   - Ensure types are generated
   - Check package exports
   - Verify import paths

2. **Type Mismatches**
   - Keep API and client packages in sync
   - Update types when changing API specs
   - Run tests to catch type errors

## Testing

When testing with OpenAPI types:

1. Use type assertions sparingly
2. Leverage TypeScript's type checking
3. Mock API responses with correct types
4. Test type safety in integration tests
