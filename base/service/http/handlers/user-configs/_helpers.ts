import type { UserConfigEntity } from "@saflib/base-db/types";
import type { UserConfig } from "@saflib/base-spec/schemas/UserConfig";

export { resolveUserIdByEmail } from "@saflib/express";

/** Maps a persisted `user_config` row to the OpenAPI `UserConfig` resource. */
export function mapUserConfigEntityToApi(entity: UserConfigEntity): UserConfig {
  return {
    userId: entity.userId,
    displayName: entity.displayName,
    marketingEmailsOptIn: entity.marketingEmailsOptIn,
    marketingEmailsOptInAt: entity.marketingEmailsOptInAt?.toISOString() ?? null,
    termsOfServiceAgreedAt:
      entity.termsOfServiceAgreedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
