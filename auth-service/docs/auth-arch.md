# SAF Authentication Architecture

This document describes how authentication headers flow through the SAF-2025 system, from the auth service through Caddy to other Node.js services.

## Overview

The authentication system uses a combination of session-based auth (for the auth service) and header-based auth (for other services). This design allows for:

1. Secure user authentication via the auth service
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

1. Basic authentication verification via `@saflib/node-express`'s `auth` middleware:

   ```typescript
   // Extracts user info from headers
   req.auth = {
     userId: number;
     userEmail: string;
   };
   ```

2. Scope validation via OpenAPI middleware (planned):
   ```typescript
   // Future: OpenAPI middleware will validate scopes against spec
   // Example spec:
   // /api/todos:
   //   delete:
   //     security:
   //       - admin: []
   ```

## Security Considerations

1. **Header Trust**: Services should only trust headers that come through Caddy's forward auth
2. **Scope Validation**: Always validate scopes against the OpenAPI spec
3. **Session Security**: Auth service uses secure session management
4. **Header Propagation**: Caddy ensures headers are only propagated from trusted sources

## Future Enhancements

1. OpenAPI middleware will be enhanced to:

   - Validate required scopes against endpoint specifications
   - Provide type-safe access to user scopes
   - Generate TypeScript types for security requirements

2. Additional security features:
   - Rate limiting
   - IP-based restrictions
   - Audit logging
   - Token-based authentication for service-to-service communication

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
