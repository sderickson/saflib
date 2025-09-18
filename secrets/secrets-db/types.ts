export type * from "./schema.ts";

// Re-export commonly used types for convenience
import type { SecretsEntity } from "./schemas/secrets.ts";
export type { SecretsEntity };

export type CreateSecretsParams = Omit<
  SecretsEntity,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateSecretsParams = {
  id: string;
} & Partial<Omit<SecretsEntity, "id" | "createdAt" | "updatedAt">>;
