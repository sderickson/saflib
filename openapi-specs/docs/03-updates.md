# Updates

A spec package contains OpenAPI specifications. These generate types used in TypeScript on both client and server, json objects which are used by node/express to validate responses and requests, and an html file for exploring your APIs. This document goes over how to update these APIs and update these outputs.

## DRY Schemas with allOf

**Best Practice:** When defining request bodies for create/update endpoints, use `allOf` with your main schema (e.g., `contact.yaml`) to avoid repeating all properties. This keeps your spec DRY and easier to maintain.

**Example:**

```yaml
post:
  summary: Create a new contact
  requestBody:
    required: true
    content:
      application/json:
        schema:
          allOf:
            - $ref: "../schemas/contact.yaml"
          required:
            - relationship_to_owner
```

This approach can be used for PUT (update) as well. The backend can ignore fields it doesn't use.

## Directory Structure

```
<your-spec-package>/
├── openapi.yaml       # Root OpenAPI specification
├── routes/           # Route specifications
│   ├── auth.yaml
│   ├── todos.yaml
│   └── ...
└── schemas/          # Shared schema definitions
    ├── user.yaml
    ├── error.yaml
    └── ...
```

## Adding New Endpoints to Your API Specs

When adding new endpoints to your project's API specifications, follow these guidelines:

1. Create schema file in `schemas/` if needed

   ```yaml
   type: object
   properties:
     id:
       type: integer
     # ... other properties
   required:
     - id
     # ... other required fields
   ```

2. Create route file in `routes/` following this pattern:

   ```yaml
   get:
     summary: List all items
     operationId: listItems # IMPORTANT: Always include operationId for type generation
     tags:
       - Feature Name
     responses:
       "200":
         description: Success response
         content:
           application/json:
             schema:
               type: array
               items:
                 $ref: "../schemas/your-schema.yaml"
       "401":
         description: Unauthorized
         content:
           application/json:
             schema:
               $ref: "../schemas/error.yaml"

   /{id}:
     get:
       operationId: getItem # IMPORTANT: Always include operationId
       # Single item endpoint
     put:
       operationId: updateItem # IMPORTANT: Always include operationId
       # Update endpoint
   ```

3. Add paths to `openapi.yaml`:

   ```yaml
   paths:
     /your-feature:
       get:
         $ref: "./routes/your-feature.yaml#/get"
       post:
         $ref: "./routes/your-feature.yaml#/post"
     /your-feature/{id}:
       get:
         $ref: "./routes/your-feature.yaml#/{id}/get"
       put:
         $ref: "./routes/your-feature.yaml#/{id}/put"
   ```

4. Add schema reference to components in `openapi.yaml`:

   ```yaml
   components:
     schemas:
       YourFeature:
         $ref: "./schemas/your-feature.yaml"
   ```

5. Generate types and validation:
   ```bash
   cd specs/apis
   npm run generate
   ```

## API Best Practices

### General Guidelines

- **Always include `operationId`**: This is required for proper type generation in the TypeScript clients.
- **Do not include `security` sections**: The security handling is currently managed separately and not used in the OpenAPI specs.
- **Use consistent naming**: Use kebab-case for paths (`/user-profiles`) and camelCase for operationIds (`getUserProfile`).
- **Group related endpoints**: Add tags to group related endpoints for better organization.

### Data Type Best Practices

- **Currency**: Always use integers (cents) instead of floats to avoid floating-point precision issues.

  ```yaml
  price:
    type: integer
    description: Price in cents (e.g., 1000 = $10.00)
  ```

- **Dates and Times**: Use ISO 8601 format strings for dates and times.

  ```yaml
  createdAt:
    type: string
    format: date-time
    description: Creation timestamp in ISO 8601 format
  ```

- **IDs**: Use integer types for database IDs (for SQLite compatibility).

  ```yaml
  id:
    type: integer
    description: Unique identifier
  ```

- **Enums**: Define enum values explicitly for better type safety.
  ```yaml
  status:
    type: string
    enum: [pending, active, completed]
    description: Current status of the item
  ```

### Response Structure

- Always include appropriate error responses (401, 403, 404, 500)
- Use consistent response structures across all endpoints
- Include pagination metadata for list endpoints

### Request Validation

- Define request validation rules in the schema
- Include examples where helpful
- Document required vs. optional fields clearly
- Always set `additionalProperties: false` on object schemas to ensure strict validation and prevent unexpected properties

## Common Patterns

- Follow existing examples in routes/ for consistent structure
- Include error responses with error schema
- Use descriptive summaries and descriptions
- Use strict schema validation with `additionalProperties: false` to prevent unexpected properties
