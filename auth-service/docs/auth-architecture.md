# Architecture

This document describes how authentication headers flow through the SAF applications, from the `auth-service` package through Caddy to other Node.js services.

## Overview

The authentication system uses a combination of cookies-session-based auth (for the auth service) and header-based auth (for other services). This design allows for:

1. Secure, centralized user authentication via the auth service
2. Stateless authentication verification for other services
3. Fine-grained access control through scopes
4. OpenAPI-based validation of security requirements

### Involved Packages

- `@saflib/auth-service`
  - handles api.{$DOMAIN}/auth/\* requests, in particular /auth/verify
  - stores user sessions
  - configuration for permissions and scopes
- `@saflib/auth-db`
  - handles identity and permission storage
  - depended on by `@saflib/auth-service`
- `@saflib/auth-spec`
  - describes the API endpoints served by `@saflib/auth-service`
- `@saflib/node-express`:
  - Common middleware for SAF Node.js services
  - Middleware for parsing authentication headers (auth.ts)
  - Middleware for enforcing api scopes (openapi.ts)
- `@saflib/openapi-specs`:
  - Docs and dependencies you can use to generate your own specs with scopes

## Header Flow

### 1. Auth Service (`/auth/*`)

The auth service handles user authentication and session management. When a user is authenticated, the following headers are set in responses:

- `X-User-ID`: The authenticated user's ID
- `X-User-Email`: The authenticated user's email
- `X-User-Scopes`: Comma-separated list of user's permission scopes

### 2. Caddy Forward Auth

Caddy uses forward authentication to verify requests to protected services. When a request comes in:

1. Caddy forwards the request to the auth service's `/auth/verify` endpoint
2. The auth service verifies the session and returns user information in headers
3. Caddy propagates these headers to the target service:
   ```caddy
   forward_auth auth:3000 {
      uri /auth/verify
      ...
      copy_headers X-User-ID X-User-Email X-User-Scopes
   }
   ```

### 3. Node.js Services

Node.js services receive the propagated headers and can use them for:

1. Basic authentication verification via `@saflib/express`'s `auth` middleware and @saflib/node`'s SafContext:

   ```typescript
   // Extracts user info from headers
   const { auth } = getSafContext();
   const userId = auth.userId;
   const userEmail = auth.userEmail;
   const scopes = auth.scopes;
   ```

2. Scope validation via OpenAPI middleware:
   ```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Your Product's API
  version: "1.0.0"
  description: The API used internally by web clients.
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

paths:
  /todos:
    delete:
      $ref: "./routes/todos.yaml#/delete"


# todos.yaml
delete:
  summary: Delete all todos
  operationId: deleteAllTodos
  tags:
    - todos
  security:
    - scopes: ["admin"]
   ```

## Future Enhancements

1. Additional security features:
- Audit logging

## Example Flow

1. User makes request to `/api/todos`
2. Caddy intercepts request and calls `/auth/verify`
3. Auth service verifies session and returns:
```

X-User-ID: 123
X-User-Email: user@example.com
X-User-Scopes: read,write

```
4. Caddy propagates headers to API service
5. API service:
- Validates user via auth middleware
- Checks scopes via OpenAPI middleware
- Processes request if authorized
```
