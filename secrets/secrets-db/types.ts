export type * from "./schema.ts";

// Re-export commonly used types for convenience
import type { SecretEntity } from "./schemas/secret.ts";
export type { SecretEntity };

export type CreateSecretParams = Omit<
  SecretEntity,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateSecretParams = {
  id: string;
} & Partial<Omit<SecretEntity, "id" | "createdAt" | "updatedAt">>;

// Re-export commonly used types for service-tokens
import type { ServiceTokenEntity } from "./schemas/service-token.ts";

export type CreateServiceTokenParams = Omit<
  ServiceTokenEntity,
  | "id"
  | "requestedAt"
  | "approved"
  | "approvedAt"
  | "approvedBy"
  | "lastUsedAt"
  | "accessCount"
>;

export type UpdateServiceTokenApprovalParams = {
  id: string;
  approved: boolean;
  approvedBy: string;
};

export type UpdateServiceTokenUsageParams = {
  id: string;
};

// Re-export commonly used types for access-requests
import type {
  AccessRequestEntity,
  AccessRequestStatus,
} from "./schemas/access-request.ts";

export type CreateAccessRequestParams = Omit<
  AccessRequestEntity,
  | "id"
  | "requestedAt"
  | "grantedAt"
  | "grantedBy"
  | "accessCount"
  | "lastAccessedAt"
  | "status"
>;

export type UpdateAccessRequestStatusParams = {
  id: string;
  status: AccessRequestStatus;
  grantedBy: string;
};

export type UpdateAccessRequestUsageParams = {
  id: string;
};
