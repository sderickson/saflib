export type * from "./schema.ts";

// Re-export commonly used types for convenience
import type { SecretEntity } from "./schemas/secrets.ts";
export type { SecretEntity };

export type CreateSecretParams = Omit<
  SecretEntity,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateSecretParams = {
  id: string;
} & Partial<Omit<SecretEntity, "id" | "createdAt" | "updatedAt">>;

// Re-export commonly used types for service-tokens
import type { ServiceTokensEntity } from "./schemas/service-tokens.ts";

export type CreateServiceTokensParams = Omit<
  ServiceTokensEntity,
  | "id"
  | "requestedAt"
  | "approved"
  | "approvedAt"
  | "approvedBy"
  | "lastUsedAt"
  | "accessCount"
>;
