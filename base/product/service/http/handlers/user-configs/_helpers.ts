import type { UserConfigEntity } from "@saflib/base-db/types";
import type { UserConfig } from "@saflib/base-spec/schemas/UserConfig";

export { resolveUserIdByEmail } from "@saflib/express";

/** Maps a persisted `user_config` row to the OpenAPI `UserConfig` resource. */
export function mapUserConfigEntityToApi(entity: UserConfigEntity): UserConfig {
  return {
    user_id: entity.user_id,
    display_name: entity.display_name,
    marketing_emails_opt_in: entity.marketing_emails_opt_in,
    marketing_emails_opt_in_at:
      entity.marketing_emails_opt_in_at?.toISOString() ?? null,
    terms_of_service_agreed_at:
      entity.terms_of_service_agreed_at?.toISOString() ?? null,
    created_at: entity.created_at.toISOString(),
    updated_at: entity.updated_at.toISOString(),
  };
}
