// Have mappers from database models to API schemas and vice versa

import type {
  SecretEntity,
  ServiceTokenEntity,
  AccessRequestEntity,
} from "@saflib/secrets-db";
import type { Secret, ServiceToken, AccessRequest } from "@saflib/secrets-spec";

/**
 * Maps a database secret entity to the format expected by the API response.
 * Converts Date objects to ISO strings and masks the secret value.
 */
export function mapSecretToResponse(secret: SecretEntity): Secret {
  return {
    id: secret.id,
    name: secret.name,
    description: secret.description ?? undefined,
    masked_value: "***", // Always mask the value in API responses
    created_at: secret.createdAt.getTime(),
    updated_at: secret.updatedAt.getTime(),
    is_active: secret.isActive,
  };
}

/**
 * Maps a database service token entity to the format expected by the API response.
 * Converts Date objects to timestamps and truncates token hash for security.
 */
export function mapServiceTokenToResponse(
  token: ServiceTokenEntity,
): ServiceToken {
  return {
    id: token.id,
    service_name: token.serviceName,
    service_version: token.serviceVersion ?? undefined,
    requested_at: token.requestedAt.getTime(),
    approved: token.approved,
    approved_at: token.approvedAt?.getTime() ?? null,
    approved_by: token.approvedBy ?? undefined,
    last_used_at: token.lastUsedAt?.getTime() ?? null,
    access_count: token.accessCount,
  };
}

/**
 * Maps a database access request entity to the format expected by the API response.
 * Converts Date objects to timestamps.
 * Note: secret_name would need to be looked up separately from the secrets table.
 */
export function mapAccessRequestToResponse(
  request: AccessRequestEntity,
): AccessRequest {
  return {
    id: request.id,
    secret_name: request.secretName,
    service_name: request.serviceName,
    requested_at: request.requestedAt.getTime(),
    status: request.status,
    granted_at: request.grantedAt?.getTime() ?? null,
    granted_by: request.grantedBy ?? undefined,
    access_count: request.accessCount,
    last_accessed_at: request.lastAccessedAt?.getTime() ?? null,
  };
}
