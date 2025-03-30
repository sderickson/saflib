# Setup

This guide explains how to set up a new OpenAPI spec package in the SAF monorepo.

## Package Structure

```
specs/your-spec/
├── dist/                    # Generated files (gitignored)
│   ├── openapi.d.ts        # Generated TypeScript types
│   ├── openapi.json        # Generated JSON spec
│   └── index.html          # Generated API docs
├── routes/                  # Route definitions
│   └── your-routes.yaml    # Route-specific specs
├── schemas/                 # Schema definitions
│   └── your-schemas.yaml   # Schema-specific specs
├── openapi.yaml            # Main OpenAPI spec file
├── package.json            # Package configuration
└── index.ts               # Package exports
```

## Package Configuration

Create a `package.json` with the following structure:

```json
{
  "name": "@saf-2025/specs-your-spec",
  "description": "Shared OpenAPI specification for your service",
  "type": "module",
  "main": "./index.ts",
  "scripts": {
    "generate:types": "openapi-typescript ./openapi.yaml -o dist/openapi.d.ts",
    "generate:json": "redocly bundle openapi.yaml --ext json --output dist/openapi.json",
    "generate:html": "redocly build-docs ./openapi.yaml --output=dist/index.html",
    "generate": "npm run generate:types && npm run generate:json && npm run generate:html",
    "serve": "serve dist -p 3000",
    "generate-and-serve": "npm run generate && npm run serve"
  },
  "devDependencies": {
    "@saflib/openapi-specs": "*"
  },
  "files": ["dist"]
}
```

## Package Exports

Create an `index.ts` file with the following exports:

```typescript
import * as json from "./dist/openapi.json" with { type: "json" };
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type * as types from "./dist/openapi.d.ts";

// Export the JSON spec for middleware
export const jsonSpec = json.default as unknown as OpenAPIV3.DocumentV3;

// Export types for consumers
export type { RequestSchema, ResponseSchema, types };
```

## OpenAPI Spec Structure

1. Create a main `openapi.yaml` file that includes your route and schema files:

```yaml
openapi: 3.0.0
info:
  title: Your Service API
  version: 1.0.0
  description: API specification for your service

servers:
  - url: http://api.docker.localhost/
    description: Development server

components:
  securitySchemes:
    scopes:
      type: apiKey
      in: header
      name: X-User-Scopes
      description: Comma-separated list of user scopes
  schemas:
    YourSchema:
      $ref: "./schemas/your-schema.yaml"

paths:
  /your-endpoint:
    get:
      $ref: "./routes/your-routes.yaml#/get"
    post:
      $ref: "./routes/your-routes.yaml#/post"
  /your-endpoint/{id}:
    put:
      $ref: "./routes/your-routes.yaml#/~1{id}/put"
    delete:
      $ref: "./routes/your-routes.yaml#/~1{id}/delete"
```

2. Create route definitions in `routes/your-routes.yaml`:

```yaml
get:
  summary: Your endpoint description
  operationId: yourOperation
  tags:
    - your-tag
  responses:
    "200":
      description: Success response
      content:
        application/json:
          schema:
            $ref: "../schemas/your-schema.yaml"
    "401":
      description: Unauthorized - missing or invalid auth headers
      content:
        application/json:
          schema:
            $ref: "../schemas/error.yaml"

post:
  summary: Create a new item
  operationId: createItem
  tags:
    - your-tag
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: "../schemas/your-schema.yaml"
  responses:
    "201":
      description: Item created
      content:
        application/json:
          schema:
            $ref: "../schemas/your-schema.yaml"
    "401":
      description: Unauthorized - missing or invalid auth headers
      content:
        application/json:
          schema:
            $ref: "../schemas/error.yaml"

# Example of an endpoint requiring admin scope
delete:
  summary: Delete all items
  operationId: deleteAllItems
  tags:
    - your-tag
  security:
    - scopes: ["admin"]
  responses:
    "204":
      description: All items successfully deleted
    "401":
      description: Unauthorized - missing or invalid auth headers
      content:
        application/json:
          schema:
            $ref: "../schemas/error.yaml"
    "403":
      description: User does not have permission to delete all items
      content:
        application/json:
          schema:
            $ref: "../schemas/error.yaml"

~1{id}/put:
  summary: Update an item
  operationId: updateItem
  tags:
    - your-tag
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: "../schemas/your-schema.yaml"
  responses:
    "200":
      description: Item updated
      content:
        application/json:
          schema:
            $ref: "../schemas/your-schema.yaml"
    "401":
      description: Unauthorized - missing or invalid auth headers
      content:
        application/json:
          schema:
            $ref: "../schemas/error.yaml"

~1{id}/delete:
  summary: Delete an item
  operationId: deleteItem
  tags:
    - your-tag
  responses:
    "204":
      description: Item deleted
    "401":
      description: Unauthorized - missing or invalid auth headers
      content:
        application/json:
          schema:
            $ref: "../schemas/error.yaml"
```

3. Create schema definitions in `schemas/your-schema.yaml`:

```yaml
type: object
required:
  - requiredField
properties:
  requiredField:
    type: string
    description: Field description
```

## Generating Specs

1. Install dependencies:

```bash
npm install
```

2. Generate specs:

```bash
npm run generate
```

This will:

- Generate TypeScript types in `dist/openapi.d.ts`
- Generate JSON spec in `dist/openapi.json`
- Generate API docs in `dist/index.html`

## Using the Spec Package

1. Import the JSON spec for middleware validation:

```typescript
import { jsonSpec } from "@saf-2025/specs-your-spec";
```

2. Import types for type safety:

```typescript
import type { YourSchema } from "@saf-2025/specs-your-spec";
```

## Best Practices

1. Keep route and schema definitions in separate files for better organization
2. Use consistent naming conventions for operationIds and schema names
3. Include proper descriptions for all endpoints and schemas
4. Define all possible response status codes in the spec
5. Use proper security schemes for protected endpoints
6. Keep the spec up to date with implementation changes
7. Use `$ref` to reference paths and schemas from separate files
8. For path parameters in references, use `~1` to escape the forward slash (e.g., `~1{id}`)
9. Always include 401 responses for endpoints that require authentication
10. Include 403 responses for endpoints that require specific scopes
