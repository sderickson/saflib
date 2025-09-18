# Secrets Service Specification

## Overview

The Secrets Service is a centralized, secure system for managing API keys, database credentials, and other sensitive configuration values. It replaces environment variable-based secret management with a more secure, auditable, and manageable approach.

## Problem Statement

Current secret management has several security and operational issues:

- Secrets stored in environment variables are less secure (exposed on machine/server)
- Complex to hide environment variables that should be configuration
- Secrets exist in plaintext in multiple places (local machines, production servers)
- No audit trail of secret access
- No approval workflow for secret access
- Difficult to rotate secrets across services

## Solution Architecture

### Core Principles

1. **Separation of Concerns**: Human management interface vs service access interface
2. **Progressive Disclosure**: Secrets never exposed through HTTP, only gRPC
3. **Audit Trail**: All access requests and secret retrievals are logged
4. **Approval Workflow**: Services must be explicitly granted access to secrets
5. **Schema-Driven**: Similar to existing env system for consistency
6. **Auto-Discovery**: Missing secrets are tracked automatically via stub creation

### Security Model

1. **Primary**: Access control (who can request what secrets)
2. **Secondary**: Service token authentication (service identity verification)
3. **Tertiary**: Encryption at rest (database protection)

## Package Structure

More or less, workflows are the source of truth for each package structure.

```
saflib/secrets/
├── secrets/                    # Schema definition system (like @saflib/env)
│   ├── index.ts
│   ├── generate.ts
│   ├── combine.ts
│   └── package.json
├── secrets-service/            # Main service package
│   ├── index.ts
│   ├── package.json
│   └── workflows/
│       └── secrets/
│           ├── init.ts
│           └── templates/
│               ├── package.json
│               ├── index.ts
│               ├── callbacks.ts
│               └── secrets.schema.combined.json
├── secrets-service-common/     # Shared types and utilities for service
│   ├── index.ts
│   ├── types.ts
│   ├── context.ts
│   ├── secrets.schema.json
│   ├── secrets.ts
│   └── package.json
├── secrets-db/                 # Database layer
│   ├── index.ts
│   ├── schemas/
│   │   ├── secrets.ts
│   │   ├── access-requests.ts
│   │   └── service-tokens.ts
│   ├── queries/
│   │   ├── secrets/
│   │   └── access-requests/
│   ├── migrations/
│   └── package.json
├── secrets-http/               # HTTP API layer
│   ├── index.ts
│   ├── http.ts
│   ├── routes/
│   │   ├── secrets/
│   │   └── access-requests/
│   ├── middleware/
│   ├── secrets.schema.json
│   ├── secrets.ts
│   └── package.json
├── secrets-proto/              # Protocol buffer definitions
│   ├── index.ts
│   ├── protos/
│   │   └── secrets.proto
│   ├── dist/
│   └── package.json
├── secrets-grpc/               # gRPC service layer
│   ├── index.ts
│   ├── grpc.ts
│   ├── rpcs/
│   │   ├── secrets/
│   │   └── tokens/
│   ├── secrets.schema.json
│   ├── secrets.ts
│   └── package.json
├── secrets-spec/               # OpenAPI specifications
│   ├── index.ts
│   ├── openapi.yaml
│   ├── routes/
│   │   └── secrets/
│   ├── schemas/
│   └── package.json
└── secrets-sdk/                # SDK with Vue components and TanStack queries
    ├── index.ts
    ├── components/
    │   ├── SecretsTable.vue
    │   ├── PendingApprovalsTable.vue
    │   ├── MissingSecretsTable.vue
    │   └── SecretForm.vue
    ├── queries/
    │   └── secrets.ts
    └── package.json
```

## Database Schema

### Secrets Table

```sql
CREATE TABLE secrets (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  value_encrypted BLOB, -- AES-256 encrypted secret value
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

### Service Tokens Table

```sql
CREATE TABLE service_tokens (
  id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of token
  service_version TEXT,
  requested_at INTEGER NOT NULL,
  approved BOOLEAN DEFAULT false,
  approved_at INTEGER,
  approved_by TEXT,
  last_used_at INTEGER,
  access_count INTEGER DEFAULT 0
);
```

### Access Requests Table

```sql
CREATE TABLE access_requests (
  id TEXT PRIMARY KEY,
  secret_id TEXT NOT NULL REFERENCES secrets(id),
  service_name TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'granted', 'denied'
  granted_at INTEGER,
  granted_by TEXT,
  access_count INTEGER DEFAULT 0,
  last_accessed_at INTEGER
);
```

### Access Logs

Access logs will be stored in Loki (existing logging infrastructure) rather than a dedicated database table. This provides:

- Automatic log rotation and cleanup
- Better integration with existing monitoring
- Reduced database load
- Structured logging with metadata

Log format:

```json
{
  "timestamp": "2025-01-17T10:30:00Z",
  "level": "info",
  "service": "secrets-service",
  "secret_id": "secret_123",
  "service_name": "identity-service",
  "success": true,
  "ip_address": "10.0.0.5",
  "user_agent": "grpc-node/1.0.0"
}
```

## Secrets Schema System

### secrets.schema.json (per package)

```json
{
  "type": "object",
  "properties": {
    "STRIPE_API_KEY": {
      "type": "string",
      "description": "Stripe API key for payment processing"
    },
    "DATABASE_URL": {
      "type": "string",
      "description": "Database connection string"
    }
  }
}
```

### Generated secrets.ts

```typescript
export interface SecretsSchema {
  STRIPE_API_KEY: string;
  DATABASE_URL: string;
}

// The secrets package exports a function that creates a typesafe client
export const createSecretsClient = <T extends Record<string, string>>(
  schema: T,
): SecretsClient<T> => {
  // Returns a client with methods like getSecret(key: keyof T): Promise<string>
  // Also provides the schema to the secrets service for validation
};
```

### secrets.schema.combined.json

Combines all dependencies, similar to existing env system.

## Authentication System

### Service Token Generation

The `@saflib/secrets` package provides token generation and management:

```typescript
import { generateServiceToken, createSecretsClient } from "@saflib/secrets";

// Generate and store service token locally
const { token, serviceName } = generateServiceToken();

// Create typesafe secrets client
const secretsClient = createSecretsClient({
  STRIPE_API_KEY: "Stripe API key for payment processing",
  DATABASE_URL: "Database connection string",
});

// Use the client
const stripeKey = await secretsClient.getSecret("STRIPE_API_KEY");
```

### Token Registration

Services register their tokens with the secrets service:

```typescript
// gRPC endpoint: RegisterToken
interface RegisterTokenRequest {
  service_name: string;
  service_version: string;
  token: string;
}

interface RegisterTokenResponse {
  status: "pending_approval" | "approved" | "denied";
  message: string;
}
```

### Token Validation

```typescript
const validateServiceToken = (token: string) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const tokenRecord = await getTokenRecord(tokenHash);
  if (!tokenRecord || !tokenRecord.approved) {
    throw new Error("Invalid or unapproved token");
  }
  return tokenRecord.service_name;
};
```

## API Endpoints

### HTTP API (Admin Interface)

- `GET /secrets` - List all secrets (values hidden)
- `POST /secrets` - Create/update secret
- `DELETE /secrets/:id` - Delete secret
- `GET /access-requests` - List pending access requests
- `POST /access-requests/:id/approve` - Approve access
- `POST /access-requests/:id/deny` - Deny access
- `GET /service-tokens` - List service tokens
- `POST /service-tokens/:id/approve` - Approve service token

### gRPC API (Service Interface)

```protobuf
service SecretsService {
  rpc GetSecret(GetSecretRequest) returns (GetSecretResponse);
  rpc RegisterToken(RegisterTokenRequest) returns (RegisterTokenResponse);
}

message GetSecretRequest {
  string secret_name = 1;
  string description = 2;  // Description from schema for validation
  string token = 3;        // Service token for authentication
}

message GetSecretResponse {
  string value = 1;
  bool success = 2;
  string error_message = 3;
}
```

## Frontend Components

### SecretsTable.vue

- Display secrets with masked values
- Show creation/update timestamps
- Edit/delete actions

### PendingApprovalsTable.vue

- Show requests needing approval
- Approve/deny actions
- Service information

### MissingSecretsTable.vue

- Show requested but missing secrets
- Add secret action
- Service that requested it

### SecretForm.vue

- Add/edit secret form
- Validation
- Encryption handling

## Workflow

### Secret Request Flow

1. Service calls `GetSecret` via gRPC
2. If secret doesn't exist, create stub and log request
3. If secret exists but no permission, log request and return "permission denied"
4. If permission exists, return secret and log access
5. Admin can view pending requests and grant/deny access

### Service Registration Flow

1. Service generates token on startup
2. Service calls `RegisterToken` via gRPC
3. Token stored as pending approval
4. Admin approves token in web interface
5. Service can now access approved secrets

## Encryption

### At Rest Encryption

- Secrets encrypted using AES-256
- Encryption key auto-generated and rotated (similar to session secrets)
- Key stored in `data/encryption-key.txt`

### Key Management

```typescript
interface EncryptionKeyStorage {
  keys: string[]; // Current + previous for rotation
  lastUpdated: number;
}

const keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
```

## Implementation Plan (rough)

### Phase 1: Core Infrastructure

1. Create `secrets` package (schema generation system, like @saflib/env)
2. Create `secrets-service-common` package (shared types and utilities)
3. Create `secrets-db` package (database layer with migrations)

### Phase 2: Service Layer

4. Create `secrets-proto` package (protocol buffer definitions)
5. Create `secrets-grpc` package (gRPC service for secret retrieval)
6. Create `secrets-http` package (HTTP API for management)
7. Create `secrets-spec` package (OpenAPI specifications)

### Phase 3: Frontend & Integration

8. Create `secrets-sdk` package (Vue components and TanStack queries)
9. Create `secrets-service` package (main service with templates)
10. Update existing services to use secrets instead of env vars

### Phase 4: Migration & Testing

11. Create migration scripts for existing secrets
12. Add comprehensive testing
13. Documentation and deployment guides

## Security Considerations

### Access Control

- HTTP API: Admin-only access (similar to identity service admin scope)
- gRPC API: Service token authentication
- Secret Storage: Encrypted at rest using AES-256
- Audit Trail: All access attempts logged with timestamps

### Threat Mitigation

- **Lateral Movement**: Service tokens prevent compromised services from accessing other services' secrets
- **Network Sniffing**: gRPC uses TLS encryption
- **Database Compromise**: Secrets encrypted at rest
- **Privilege Escalation**: Even database admin can't read secrets without encryption key
- **Audit Requirements**: Comprehensive logging of all access attempts

## Benefits

1. **Security**: Secrets never exposed via HTTP, encrypted at rest, comprehensive audit trail
2. **Usability**: Clear separation between management and access, automatic stub creation
3. **Scalability**: Schema-driven approach allows easy addition of new secrets
4. **Integration**: Follows existing patterns, making it familiar to implement
5. **Compliance**: Meets security framework requirements for secret management
6. **Operational**: Centralized management, approval workflows, rotation capabilities

## Success Metrics

- All secrets migrated from environment variables
- Zero secrets exposed through HTTP endpoints
- 100% audit coverage of secret access
- Approval workflow for all new secret access requests
- Automatic stub creation for missing secrets
- Successful integration with existing services

## Docker Volume Requirements

For this system to work properly, Docker Compose files **must** set up an unmounted volume to persist generated secrets and tokens across deployments:

```yaml
services:
  secrets-service:
    volumes:
      - secrets-data:/app/data # Unmounted volume for secrets storage

  identity-service:
    volumes:
      - identity-secrets:/app/data # Unmounted volume for service tokens

volumes:
  secrets-data:
  identity-secrets:
```

This ensures that:

- Generated encryption keys persist across deployments
- Service tokens are not lost during container restarts
- Secret stubs and access requests are maintained
- The system can recover from container failures
